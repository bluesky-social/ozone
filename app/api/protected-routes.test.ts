import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import {
  PLUGIN_AUTH_CSRF_HEADER,
  PLUGIN_AUTH_CSRF_VALUE,
} from '@/lib/plugins/auth/constants'
import { GET as getSnapshot } from './get-record-snapshot/route'
import {
  GET as getImageSearch,
  POST as postImageSearch,
} from './image-search/search/route'

function request(path: string, method = 'GET') {
  return new NextRequest(`https://admin.example${path}`, {
    method,
    headers: {
      [PLUGIN_AUTH_CSRF_HEADER]: PLUGIN_AUTH_CSRF_VALUE,
      'sec-fetch-site': 'same-origin',
    },
  })
}

describe('protected plugin proxy routes', () => {
  afterEach(() => vi.restoreAllMocks())

  it.each([
    [
      'image search GET',
      () => getImageSearch(request('/api/image-search/search')),
    ],
    [
      'image search POST',
      () => postImageSearch(request('/api/image-search/search', 'POST')),
    ],
    [
      'record snapshot GET',
      () =>
        getSnapshot(
          request('/api/get-record-snapshot?uri=at%3A%2F%2Fexample'),
        ),
    ],
  ])('rejects unauthenticated %s requests before proxying', async (_, call) => {
    const upstreamFetch = vi.spyOn(globalThis, 'fetch')

    const response = await call()

    expect(response.status).toBe(401)
    expect(upstreamFetch).not.toHaveBeenCalled()
  })
})
