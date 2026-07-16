import { useMutation } from '@tanstack/react-query'
import { useCallback, useRef } from 'react'
import { toast } from 'react-toastify'
import { IMAGE_SEARCH_API_URL } from './constants'

export function useIsImageSearchEnabled(): boolean {
  return !!IMAGE_SEARCH_API_URL
}

// request
export interface ImageSearchOptions {
  /** Max hamming distance (0-256) for a match; lower = stricter */
  threshold?: number
  /** How many days back to search */
  lookbackDays?: number
  /** Max number of matches to return */
  limit?: number
  /** Server-side search timeout in seconds */
  timeout?: number
}
export type ImageSearchInput =
  | { hash: string; options?: ImageSearchOptions }
  | { image: File | Blob; options?: ImageSearchOptions }
  | { url: string; options?: ImageSearchOptions }

// response
export interface ImageSearchMatch {
  /** When the matched record was indexed (ISO 8601) */
  timestamp: string
  /** DID of the account that posted the matched image */
  did: string
  /** AT-URI of the matched record */
  uri: string
  /** Text of the matched post, if any */
  postText: string
  /** PDQ hash of the matched image (64-char hex) */
  matchedHash: string
  /** Hamming distance between the query and matched hashes (0-256) */
  distance: number
}
export interface ImageSearchResult {
  /** PDQ hash that was searched (computed server-side for image uploads) */
  query: string
  /** Threshold the search ran with */
  threshold: number
  /** Lookback window the search ran with */
  lookbackDays: number
  /** Total number of matches found */
  total: number
  matches: ImageSearchMatch[]
}

function optionsToQuery(options: ImageSearchOptions = {}): URLSearchParams {
  const params = new URLSearchParams()
  for (const key of [
    'threshold',
    'lookbackDays',
    'limit',
    'timeout',
  ] as const) {
    const value = options[key]
    if (value !== undefined) {
      params.set(key, String(value))
    }
  }
  return params
}

async function runSearch(
  input: ImageSearchInput,
  signal?: AbortSignal,
): Promise<ImageSearchResult | null> {
  const params = optionsToQuery(input.options)

  let response: Response
  if ('hash' in input || 'url' in input) {
    if ('hash' in input) {
      params.set('hash', input.hash)
    } else {
      params.set('url', input.url)
    }
    response = await fetch(`/api/image-search/search?${params.toString()}`, {
      signal,
    })
  } else {
    const query = params.toString()
    response = await fetch(
      `/api/image-search/search${query ? `?${query}` : ''}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': input.image.type || 'application/octet-stream',
        },
        body: input.image,
        signal,
      },
    )
  }

  if (!response.ok) {
    // Suppress backend/proxy errors so an absent or misconfigured image search service doesnt break UI
    return null
  }

  return (await response.json()) as ImageSearchResult
}

// useImageSearch returns a mutation plus a cancel() to abort an in-flight search
// early. Call mutate({ hash }) or mutate({ image }) to search on demand; call
// cancel() to abort. Aborting rejects the fetch with an AbortError, which the
// onError handler swallows, so the UI just stops loading.
export function useImageSearch() {
  // One controller per in-flight search; replaced on each new mutate.
  const abortRef = useRef<AbortController | null>(null)

  const mutation = useMutation<
    ImageSearchResult | null,
    Error,
    ImageSearchInput
  >({
    mutationFn: (input) => {
      // Abort any prior in-flight search before starting a new one.
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      return runSearch(input, controller.signal)
    },
    retry: false,
    onError: (e) => {
      if (e.name === 'AbortError') {
        // ignore cancellations
      } else {
        console.error('Image search failed', e)
        toast.error('Image search failed. Please try again later.', {
          toastId: 'image-search-error',
        })
      }
    },
  })

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    // Drop the pending/loading state so the UI returns to idle immediately.
    mutation.reset()
  }, [mutation])

  return { ...mutation, cancel }
}
