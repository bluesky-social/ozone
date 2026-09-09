import { Agent } from '@atproto/api'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  PLUGIN_AUTH_CSRF_HEADER,
  PLUGIN_AUTH_CSRF_VALUE,
  PLUGIN_AUTH_LXM,
} from './constants'
import { createPluginFetch, type PluginProxyPath } from './client'

const OZONE_DID = 'did:plc:ozone'

function serviceToken(expiresAt: number, id = 'token') {
  const claims = btoa(JSON.stringify({ exp: Math.floor(expiresAt / 1_000) }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `header.${claims}.${id}`
}

function createAgent(token = serviceToken(Date.now() + 60_000)) {
  const getServiceAuth = vi.fn().mockResolvedValue({
    data: { token },
  })
  const pdsAgent = {
    com: {
      atproto: {
        server: { getServiceAuth },
      },
    },
  } as unknown as Agent
  return { getServiceAuth, pdsAgent }
}

describe('plugin authorization fetch', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('reuses a service token while it is not close to expiring', async () => {
    const { getServiceAuth, pdsAgent } = createAgent()
    const apiFetch = vi.fn().mockResolvedValue(Response.json({ ok: true }))
    vi.stubGlobal('fetch', apiFetch)
    const pluginFetch = createPluginFetch(pdsAgent, OZONE_DID)

    await pluginFetch('/api/image-search/search?hash=a')
    await pluginFetch('/api/get-record-snapshot?uri=a')

    expect(getServiceAuth).toHaveBeenCalledOnce()
    expect(getServiceAuth).toHaveBeenCalledWith(
      { aud: OZONE_DID, lxm: PLUGIN_AUTH_LXM },
      { signal: undefined },
    )

    const proxyHeaders = new Headers(apiFetch.mock.calls[0][1].headers)
    expect(proxyHeaders.get('Authorization')).toContain('Bearer header.')
    expect(proxyHeaders.get(PLUGIN_AUTH_CSRF_HEADER)).toBe(
      PLUGIN_AUTH_CSRF_VALUE,
    )
  })

  it('mints a new token shortly before the cached token expires', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-09-09T12:00:00Z')
    vi.setSystemTime(now)
    const firstToken = serviceToken(now.getTime() + 60_000, 'first')
    const secondToken = serviceToken(now.getTime() + 120_000, 'second')
    const { getServiceAuth, pdsAgent } = createAgent(firstToken)
    getServiceAuth.mockResolvedValueOnce({ data: { token: firstToken } })
    getServiceAuth.mockResolvedValueOnce({ data: { token: secondToken } })
    const apiFetch = vi.fn().mockResolvedValue(Response.json({ ok: true }))
    vi.stubGlobal('fetch', apiFetch)
    const pluginFetch = createPluginFetch(pdsAgent, OZONE_DID)

    await pluginFetch('/api/get-record-snapshot?uri=a')
    vi.advanceTimersByTime(31_000)
    await pluginFetch('/api/get-record-snapshot?uri=b')

    expect(getServiceAuth).toHaveBeenCalledTimes(2)
    const secondHeaders = new Headers(apiFetch.mock.calls[1][1].headers)
    expect(secondHeaders.get('Authorization')).toBe(`Bearer ${secondToken}`)
  })

  it.each([
    ['an opaque token', 'opaque-token'],
    ['a non-finite expiry', `header.${btoa('{"exp":1e309}')}.signature`],
  ])('does not cache %s', async (_, token) => {
    const { getServiceAuth, pdsAgent } = createAgent(token)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ ok: true })),
    )
    const pluginFetch = createPluginFetch(pdsAgent, OZONE_DID)

    await pluginFetch('/api/get-record-snapshot?uri=a')
    await pluginFetch('/api/get-record-snapshot?uri=b')

    expect(getServiceAuth).toHaveBeenCalledTimes(2)
  })

  it('does not contact the proxy when token minting fails', async () => {
    const { getServiceAuth, pdsAgent } = createAgent()
    getServiceAuth.mockRejectedValue(new Error('token mint failed'))
    const apiFetch = vi.fn()
    vi.stubGlobal('fetch', apiFetch)

    await expect(
      createPluginFetch(pdsAgent, OZONE_DID)(
        '/api/image-search/search?hash=a',
      ),
    ).rejects.toThrow('token mint failed')
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('does not mint or send a token outside the plugin proxy routes', async () => {
    const { getServiceAuth, pdsAgent } = createAgent()
    const apiFetch = vi.fn()
    vi.stubGlobal('fetch', apiFetch)

    await expect(
      createPluginFetch(pdsAgent, OZONE_DID)(
        '//attacker.example/api/image-search/search' as PluginProxyPath,
      ),
    ).rejects.toThrow('limited to proxy routes')
    expect(getServiceAuth).not.toHaveBeenCalled()
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('forwards the request abort signal while minting the token', async () => {
    const { getServiceAuth, pdsAgent } = createAgent()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ ok: true })),
    )
    const controller = new AbortController()

    await createPluginFetch(pdsAgent, OZONE_DID)(
      '/api/get-record-snapshot?uri=a',
      { signal: controller.signal },
    )

    expect(getServiceAuth).toHaveBeenCalledWith(
      { aud: OZONE_DID, lxm: PLUGIN_AUTH_LXM },
      { signal: controller.signal },
    )
  })
})
