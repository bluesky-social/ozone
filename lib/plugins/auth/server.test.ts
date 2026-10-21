import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import {
  PLUGIN_AUTH_CSRF_HEADER,
  PLUGIN_AUTH_CSRF_VALUE,
} from './constants'
import { authorizePluginRequest } from './server'

const AUTHORIZATION = 'Bearer service-token'
const ROLE = 'tools.ozone.team.defs#roleModerator'

function request({
  authorization = AUTHORIZATION,
  csrf = PLUGIN_AUTH_CSRF_VALUE,
  fetchSite = 'same-origin',
}: {
  authorization?: string
  csrf?: string
  fetchSite?: string
} = {}) {
  return new NextRequest('https://admin.example/api/image-search/search', {
    headers: {
      Authorization: authorization,
      [PLUGIN_AUTH_CSRF_HEADER]: csrf,
      'sec-fetch-site': fetchSite,
    },
  })
}

describe('plugin authorization', () => {
  beforeEach(() => {
    process.env.OZONE_AUTH_SERVICE_URL = 'https://ozone.example'
    delete process.env.OZONE_PUBLIC_URL
  })

  afterEach(() => {
    delete process.env.OZONE_AUTH_SERVICE_URL
    delete process.env.OZONE_PUBLIC_URL
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('accepts a service token for an Ozone team member', async () => {
    const authFetch = vi.fn().mockResolvedValue(
      Response.json({
        viewer: { role: ROLE },
      }),
    )
    vi.stubGlobal('fetch', authFetch)

    expect(await authorizePluginRequest(request())).toBeNull()
    expect(authFetch).toHaveBeenCalledOnce()

    const [url, init] = authFetch.mock.calls[0]
    expect(url.toString()).toBe(
      'https://ozone.example/xrpc/tools.ozone.server.getConfig',
    )
    expect(init).toMatchObject({
      method: 'GET',
      headers: { Authorization: AUTHORIZATION },
      cache: 'no-store',
      redirect: 'error',
    })
  })

  it('rejects a missing bearer token without contacting Ozone', async () => {
    const authFetch = vi.fn()
    vi.stubGlobal('fetch', authFetch)
    const unauthenticated = request({ authorization: '' })

    const response = await authorizePluginRequest(unauthenticated)

    expect(response?.status).toBe(401)
    expect(authFetch).not.toHaveBeenCalled()
  })

  it.each([
    ['an invalid CSRF marker', { csrf: 'wrong' }],
    ['a cross-site request', { fetchSite: 'cross-site' }],
  ])('rejects %s', async (_, requestOptions) => {
    const authFetch = vi.fn()
    vi.stubGlobal('fetch', authFetch)

    const response = await authorizePluginRequest(request(requestOptions))

    expect(response?.status).toBe(403)
    expect(authFetch).not.toHaveBeenCalled()
  })

  it('rejects a token whose response has no recognized team role', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          viewer: { role: 'tools.ozone.team.defs#roleUnknown' },
        }),
      ),
    )

    const response = await authorizePluginRequest(request())

    expect(response?.status).toBe(401)
  })

  it('fails closed when Ozone is unavailable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('unavailable')))

    const response = await authorizePluginRequest(request())

    expect(response?.status).toBe(503)
  })

  it('fails closed when the Ozone URL is not configured', async () => {
    delete process.env.OZONE_AUTH_SERVICE_URL
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const authFetch = vi.fn()
    vi.stubGlobal('fetch', authFetch)

    const response = await authorizePluginRequest(request())

    expect(response?.status).toBe(503)
    expect(authFetch).not.toHaveBeenCalled()
  })
})
