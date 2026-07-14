import { NextRequest, NextResponse } from 'next/server'

import type { ImageSearchResult } from '@/lib/useImageSearch'

// Server-side proxy to the image search service
const IMAGE_SEARCH_API_URL = process.env.NEXT_PUBLIC_IMAGE_SEARCH_API_URL
const IMAGE_SEARCH_AUTH_HEADER = process.env.IMAGE_SEARCH_AUTH_HEADER
const SEARCH_PARAMS = [
  'threshold',
  'lookbackDays',
  'limit',
  'timeout',
] as const satisfies readonly (keyof ImageSearchQueryParams)[]

/**
 * Query params accepted by both GET and POST. GET additionally requires
 * exactly one of `hash` or `url`; POST takes the image bytes as the body.
 */
export interface ImageSearchQueryParams {
  /** PDQ hash to search (64-char hex). GET only; mutually exclusive with url */
  hash?: string
  /** https URL of an image to search. GET only; mutually exclusive with hash */
  url?: string
  /** Max hamming distance (0-256) for a match; lower = stricter */
  threshold?: string
  /** How many days back to search */
  lookbackDays?: string
  /** Max number of matches to return */
  limit?: string
  /** Server-side search timeout in seconds */
  timeout?: string
}

export interface ImageSearchErrorResponse {
  error: string
}

export type ImageSearchResponse = NextResponse<
  ImageSearchResult | ImageSearchErrorResponse
>

function notConfigured(): ImageSearchResponse {
  return NextResponse.json(
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

// GET proxies a raw-hash search (?hash=<64 hex>) or an image-URL search
// (?url=<https://example.com/...>)
export async function GET(request: NextRequest): Promise<ImageSearchResponse> {
  if (!IMAGE_SEARCH_API_URL) {
    return notConfigured()
  }

  const searchParams = request.nextUrl.searchParams
  const hash = searchParams.get('hash')
  const url = searchParams.get('url')
  if (!hash === !url) {
    return NextResponse.json(
      { error: 'Need either a hash or url' },
      { status: 400 },
    )
  }

  try {
    const target = new URL('/api/search', IMAGE_SEARCH_API_URL)
    if (hash) {
      target.searchParams.set('hash', hash)
    } else if (url) {
      target.searchParams.set('url', url)
    }
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
export async function POST(request: NextRequest): Promise<ImageSearchResponse> {
  if (!IMAGE_SEARCH_API_URL) {
    return notConfigured()
  }

  try {
    const target = new URL('/api/search', IMAGE_SEARCH_API_URL)
    forwardSearchParams(request.nextUrl.searchParams, target)

    const body = await request.arrayBuffer()
    if (body.byteLength === 0) {
      return NextResponse.json({ error: 'Empty image body' }, { status: 400 })
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

async function relay(response: Response): Promise<ImageSearchResponse> {
  if (!response.ok) {
    const errorData = (await response
      .json()
      .catch(() => ({ error: 'Unknown error' }))) as ImageSearchErrorResponse
    return NextResponse.json(errorData, { status: response.status })
  }
  const data = (await response.json()) as ImageSearchResult
  return NextResponse.json(data)
}

function handleError(error: unknown): ImageSearchResponse {
  if (error instanceof Error && error.name === 'AbortError') {
    return NextResponse.json({ error: 'Search cancelled' }, { status: 499 })
  }
  console.error('Error proxying image search:', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
