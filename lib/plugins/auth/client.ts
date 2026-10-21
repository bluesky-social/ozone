'use client'

import { Agent } from '@atproto/api'

import {
  PLUGIN_AUTH_CSRF_HEADER,
  PLUGIN_AUTH_CSRF_VALUE,
  PLUGIN_AUTH_LXM,
} from './constants'

export type PluginProxyPath =
  | `/api/image-search/${string}`
  | `/api/get-record-snapshot${string}`

export type PluginFetch = (
  input: PluginProxyPath,
  init?: RequestInit,
) => Promise<Response>

const TOKEN_EXPIRY_SKEW_MS = 30_000

type CachedToken = {
  token: string
  expiresAt: number
}

function getTokenExpiry(token: string): number | undefined {
  try {
    const payload = token.split('.')[1]
    if (!payload) return undefined

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const claims: unknown = JSON.parse(atob(base64))
    const exp = claims?.['exp']
    if (typeof exp !== 'number' || !Number.isFinite(exp)) return undefined

    const expiresAt = exp * 1_000
    return Number.isFinite(expiresAt) ? expiresAt : undefined
  } catch {
    return undefined
  }
}

function assertPluginProxyPath(input: PluginProxyPath) {
  const pluginOrigin = 'https://ozone.invalid'
  const url = new URL(input, pluginOrigin)
  const allowed =
    url.origin === pluginOrigin &&
    (url.pathname.startsWith('/api/image-search/') ||
      url.pathname === '/api/get-record-snapshot')
  if (!allowed) {
    throw new TypeError('Plugin authorization is limited to proxy routes')
  }
}

export function createPluginFetch(
  pdsAgent: Agent,
  ozoneDid: string,
): PluginFetch {
  let cachedToken: CachedToken | undefined

  return async (input, init = {}) => {
    assertPluginProxyPath(input)
    const now = Date.now()
    let token =
      cachedToken && cachedToken.expiresAt > now + TOKEN_EXPIRY_SKEW_MS
        ? cachedToken.token
        : undefined

    if (!token) {
      const { data } = await pdsAgent.com.atproto.server.getServiceAuth(
        {
          aud: ozoneDid,
          lxm: PLUGIN_AUTH_LXM,
        },
        { signal: init.signal ?? undefined },
      )
      token = data.token

      const expiresAt = getTokenExpiry(token)
      cachedToken = expiresAt ? { token, expiresAt } : undefined
    }

    const headers = new Headers(init.headers)
    headers.set(PLUGIN_AUTH_CSRF_HEADER, PLUGIN_AUTH_CSRF_VALUE)
    headers.set('Authorization', `Bearer ${token}`)

    return fetch(input, {
      ...init,
      credentials: 'same-origin',
      headers,
    })
  }
}
