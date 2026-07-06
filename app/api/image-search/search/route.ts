import { NextRequest } from 'next/server'

// Server-side proxy to the image search service
const IMAGE_SEARCH_API_URL = process.env.IMAGE_SEARCH_API_URL
const IMAGE_SEARCH_AUTH_HEADER = process.env.IMAGE_SEARCH_AUTH_HEADER
const SEARCH_PARAMS = ['threshold', 'lookbackDays', 'limit', 'timeout']

function notConfigured() {
  return Response.json(
    { error: 'Image search is not configured' },
    { status: 501 },
  )
}

function authHeaders(base: Record<string, string> = {}) {
  const headers = { ...base }
  if (IMAGE_SEARCH_AUTH_HEADER) {
    headers['Authorization'] = IMAGE_SEARCH_AUTH_HEADER
  }
  return headers
}

function forwardSearchParams(from: URLSearchParams, to: URL) {
  for (const key of SEARCH_PARAMS) {
    const value = from.get(key)
    if (value !== null) {
      to.searchParams.set(key, value)
    }
  }
}

// GET proxies a raw-hash search: /api/image-search/search?hash=<64 hex>&threshold=...
export async function GET(request: NextRequest) {
  if (!IMAGE_SEARCH_API_URL) {
    return notConfigured()
  }

  const searchParams = request.nextUrl.searchParams
  const hash = searchParams.get('hash')
  if (!hash) {
    return Response.json(
      { error: 'Missing required query parameter: hash' },
      { status: 400 },
    )
  }

  try {
    const target = new URL('/api/search', IMAGE_SEARCH_API_URL)
    target.searchParams.set('hash', hash)
    forwardSearchParams(searchParams, target)

    const response = await fetch(target.toString(), {
      method: 'GET',
      headers: authHeaders(),
      signal: request.signal,
    })
    return relay(response)
  } catch (error) {
    return handleError(error)
  }
}

// POST proxies an image search to the image search service
export async function POST(request: NextRequest) {
  if (!IMAGE_SEARCH_API_URL) {
    return notConfigured()
  }

  try {
    const target = new URL('/api/search', IMAGE_SEARCH_API_URL)
    forwardSearchParams(request.nextUrl.searchParams, target)

    const body = await request.arrayBuffer()
    if (body.byteLength === 0) {
      return Response.json({ error: 'Empty image body' }, { status: 400 })
    }

    const contentType =
      request.headers.get('content-type') || 'application/octet-stream'

    const response = await fetch(target.toString(), {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': contentType }),
      body,
      signal: request.signal,
    })
    return relay(response)
  } catch (error) {
    return handleError(error)
  }
}

async function relay(response: Response) {
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: 'Unknown error' }))
    return Response.json(errorData, { status: response.status })
  }
  const data = await response.json()
  return Response.json(data)
}

function handleError(error: unknown) {
  if (error instanceof Error && error.name === 'AbortError') {
    return Response.json({ error: 'Search cancelled' }, { status: 499 })
  }
  console.error('Error proxying image search:', error)
  return Response.json({ error: 'Internal server error' }, { status: 500 })
}
