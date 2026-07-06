import { useMutation, useQuery } from '@tanstack/react-query'
import { useCallback, useRef } from 'react'
import { toast } from 'react-toastify'

export function useIsImageSearchEnabled(): boolean {
  const { data } = useQuery({
    queryKey: ['imageSearchEnabled'],
    queryFn: async () => {
      const response = await fetch('/api/image-search/enabled')
      if (!response.ok) return false
      const body = (await response.json()) as { enabled?: boolean }
      return !!body.enabled
    },
    retry: false,
    staleTime: Infinity,
  })
  return data ?? false
}

// request
export interface ImageSearchOptions {
  threshold?: number
  lookbackDays?: number
  limit?: number
  timeout?: number
}
export type ImageSearchInput =
  | { hash: string; options?: ImageSearchOptions }
  | { image: File | Blob; options?: ImageSearchOptions }

// response
export interface ImageSearchMatch {
  timestamp: string
  did: string
  uri: string
  postText: string
  matchedHash: string
  distance: number
}
export interface ImageSearchResult {
  query: string
  threshold: number
  lookbackDays: number
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
  if ('hash' in input) {
    params.set('hash', input.hash)
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
