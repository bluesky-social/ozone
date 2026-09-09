import { NextRequest, NextResponse } from 'next/server'

import {
  PLUGIN_AUTH_CSRF_HEADER,
  PLUGIN_AUTH_CSRF_VALUE,
  PLUGIN_AUTH_LXM,
} from './constants'

const AUTH_TIMEOUT_MS = 5_000
const VALID_ROLES = new Set([
  'tools.ozone.team.defs#roleAdmin',
  'tools.ozone.team.defs#roleModerator',
  'tools.ozone.team.defs#roleTriage',
])

class PluginAuthConfigurationError extends Error {}

function getAuthorizationUrl() {
  const configured =
    process.env.OZONE_AUTH_SERVICE_URL || process.env.OZONE_PUBLIC_URL
  if (!configured) {
    throw new PluginAuthConfigurationError(
      'OZONE_AUTH_SERVICE_URL is not configured',
    )
  }

  const url = new URL(`/xrpc/${PLUGIN_AUTH_LXM}`, configured)
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (
    url.protocol !== 'https:' &&
    !(process.env.NODE_ENV !== 'production' && local)
  ) {
    throw new PluginAuthConfigurationError(
      'OZONE_AUTH_SERVICE_URL must use HTTPS',
    )
  }
  return url
}

function validatePluginRequest(request: NextRequest) {
  if (
    request.headers.get(PLUGIN_AUTH_CSRF_HEADER) !==
    PLUGIN_AUTH_CSRF_VALUE
  ) {
    return NextResponse.json(
      { error: 'Invalid plugin request' },
      { status: 403 },
    )
  }

  const fetchSite = request.headers.get('sec-fetch-site')
  if (fetchSite && fetchSite !== 'same-origin') {
    return NextResponse.json(
      { error: 'Invalid plugin request' },
      { status: 403 },
    )
  }
  return null
}

export async function authorizePluginRequest(request: NextRequest) {
  const invalidRequest = validatePluginRequest(request)
  if (invalidRequest) return invalidRequest

  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 },
    )
  }

  try {
    const authResponse = await fetch(getAuthorizationUrl(), {
      method: 'GET',
      headers: { Authorization: authorization },
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    })
    if (!authResponse.ok) {
      return NextResponse.json(
        { error: 'Authentication required' },
        {
          status:
            authResponse.status === 401 || authResponse.status === 403
              ? 401
              : 503,
        },
      )
    }

    const data = (await authResponse.json()) as {
      viewer?: { role?: unknown }
    }
    const role = data.viewer?.role
    if (typeof role !== 'string' || !VALID_ROLES.has(role)) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }
    return null
  } catch (error) {
    if (error instanceof PluginAuthConfigurationError) {
      console.error(error.message)
    } else {
      console.error('Error validating plugin authorization')
    }
    return NextResponse.json(
      { error: 'Plugin authentication unavailable' },
      { status: 503 },
    )
  }
}
