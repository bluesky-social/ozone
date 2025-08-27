import { CollectionId } from '@/reports/helpers/subject'
import { SOCIAL_APP_URL } from './constants'
import { AtUri } from '@atproto/api'

export function classNames(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export function parseAtUri(
  uri: string,
): { did: string; collection: string | null; rkey: string | null } | null {
  const match = uri.match(/^at:\/\/(.+?)(\/.+?)?(\/.+?)?$/)
  if (!match) return null
  const [, did, collection, rkey] = match
  return {
    did,
    collection: collection?.replace('/', '') ?? null,
    rkey: rkey?.replace('/', '') ?? null,
  }
}

export function createAtUri(parts: {
  did: string
  collection?: string | null
  rkey?: string | null
}): string {
  let uri = `at://${parts.did}`
  uri += parts.collection ? `/${parts.collection}` : ''
  uri += parts.rkey ? `/${parts.rkey}` : ''
  return uri
}

export function truncate(str: string, length: number) {
  if (str.length <= length) return str
  return str.slice(0, length) + '…'
}

export function formatBytes(bytes) {
  const units = ['bytes', 'kb', 'mb', 'gb', 'tb', 'pb', 'eb', 'zb', 'yb']
  let l = 0
  let n = parseInt(bytes, 10) || 0
  while (n >= 1024 && ++l) {
    n = n / 1024
  }
  return n.toFixed(n < 10 && l > 0 ? 1 : 0) + units[l]
}

export function takesKeyboardEvt(el?: EventTarget | null) {
  if (!el) return false
  const htmlEl = el as HTMLElement
  return (
    (['TEXTAREA', 'INPUT', 'SELECT'].includes(htmlEl.tagName) &&
      !htmlEl.getAttribute('disabled')) ||
    // We open images from posts in modal windows and the modals are wrapped in this class
    // so we want to make sure users can navigate within the image modal without navigating within the queue
    htmlEl.classList.contains('yarl__container')
  )
}

const blueSkyUrlMatcher = new RegExp('(https?://)?.*bsky.app')

export const isBlueSkyAppUrl = (url: string) => blueSkyUrlMatcher.test(url)

export const buildBlueSkyAppUrl = (
  params: { did: string } & ({ collection: string; rkey: string } | {}),
) => {
  let url = `${SOCIAL_APP_URL}/profile`

  if ('did' in params) {
    url += `/${params.did}`
  }

  if ('collection' in params) {
    url += `/${params.collection}/${params.rkey}`
  }

  return url
}

type BlueSkyAppUrlFragments = {
  did?: string
  handle?: string
  rkey?: string
  collection?: string
}

export const getFragmentsFromBlueSkyAppUrl = (url: string) => {
  const fragments = url.match(blueSkyUrlMatcher)
  if (!fragments) return null

  const parts: BlueSkyAppUrlFragments = {}

  let collectionIndex = -1
  const collections = Object.values(CollectionId) as string[]
  const identifiers = url
    .replace(fragments[0], '')
    .replace('/profile', '')
    .split('/')

  identifiers.forEach((part, i) => {
    if (isValidDid(part)) {
      parts.did = part
    }
    if (isValidHandle(part)) {
      parts.handle = part
    }

    // Weirdly, in the app, we use /lists/ instead of /list/ so we need to account for that too
    if (part === 'lists') {
      part = 'list'
    }

    // Usually, in the URL within the app, we would use /post/:rkey or /lists/:rkey
    // but the collection name would be fully qualified name with . separator
    // so, we want to make sure we can match the collection name with the URL
    const isFullCollectionName = collections.includes(part)
    const partialCollectionName = collections.find((col) =>
      col.includes(`.${part}`),
    )
    if (part && (isFullCollectionName || partialCollectionName)) {
      collectionIndex = i
      parts.collection = isFullCollectionName ? part : partialCollectionName
    }
  })

  if (collectionIndex >= 0) {
    parts.rkey = identifiers[collectionIndex + 1]
  }

  return parts
}

export const buildAtUriFromFragments = (
  fragments: BlueSkyAppUrlFragments | null,
) => {
  if (fragments?.did || fragments?.handle) {
    const uri = AtUri.make(
      `${fragments?.did || fragments?.handle}`,
      fragments.collection,
      fragments.rkey,
    )
    return uri.toString()
  }

  return ''
}

export const isValidDid = (did?: string | null) => did?.startsWith('did:')
export const isValidHandle = (handle?: string | null) => handle?.includes('.')

export function unique<T>(arr: T[]) {
  return [...new Set(arr)]
}

export function pluralize(
  count: number,
  singular: string,
  {
    plural = `${singular}s`,
    includeCount = true,
  }: { plural?: string; includeCount?: boolean } = {},
) {
  const suffix = count === 1 ? singular : plural
  return includeCount ? `${count} ${suffix}` : suffix
}

export function chunkArray<T>(arr: T[], chunkSize: number) {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += chunkSize) {
    chunks.push(arr.slice(i, i + chunkSize))
  }
  return chunks
}

// @NOTE hash function is insecure, though suitable for basic purposes such as bucketing.
export function simpleHash(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; ++i) {
    const chr = str.charCodeAt(i)
    hash = ((hash << 5) - hash + chr) | 0
  }
  return hash
}
export function isNonNullable<V>(v: V): v is NonNullable<V> {
  return v != null
}

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export interface BatchedOperationOptions<T, R> {
  items: T[]
  batchSize?: number
  maxRetries?: number
  retryDelay?: number
  operation: (item: T) => Promise<R>
  isRateLimit?: (error: any) => boolean
  onBatchStart?: (batchIndex: number, totalBatches: number) => void
  onBatchProgress?: (processed: number, failed: number, total: number, batchIndex: number, totalBatches: number, retryAttempt?: number) => void
  onBatchComplete?: (results: Array<{ item: T; success: boolean; result?: R; error?: string }>) => void
}

export interface BatchedOperationResult<T, R> {
  results: Array<{ item: T; success: boolean; result?: R; error?: string }>
  successCount: number
  failedCount: number
  totalCount: number
}

export async function executeBatchedOperation<T, R>({
  items,
  batchSize = 25,
  maxRetries = 3,
  retryDelay = 3000,
  operation,
  isRateLimit = (error) => error?.status === 429 || error?.message?.includes('rate limit') || error?.message?.includes('429'),
  onBatchStart,
  onBatchProgress,
  onBatchComplete,
}: BatchedOperationOptions<T, R>): Promise<BatchedOperationResult<T, R>> {
  const chunks = chunkArray(items, batchSize)
  const results: Array<{ item: T; success: boolean; result?: R; error?: string }> = []
  let processed = 0
  let failed = 0
  const totalCount = items.length

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    let retryCount = 0

    onBatchStart?.(i, chunks.length)

    while (retryCount <= maxRetries) {
      try {
        onBatchProgress?.(processed, failed, totalCount, i, chunks.length, retryCount > 0 ? retryCount : undefined)

        const chunkResults = await Promise.allSettled(
          chunk.map(async (item) => {
            try {
              const result = await operation(item)
              return { item, success: true as const, result }
            } catch (error: any) {
              return {
                item,
                success: false as const,
                error: error?.message || 'Unknown error'
              }
            }
          })
        )

        let hasRateLimitError = false
        chunkResults.forEach((chunkResult) => {
          if (chunkResult.status === 'fulfilled') {
            const result = chunkResult.value
            results.push(result)
            if (result.success) {
              processed++
            } else {
              failed++
              if (isRateLimit && isRateLimit({ message: result.error })) {
                hasRateLimitError = true
              }
            }
          } else {
            results.push({
              item: chunk[chunkResults.indexOf(chunkResult)],
              success: false,
              error: chunkResult.reason?.message || 'Unknown error'
            })
            failed++
            if (isRateLimit && isRateLimit(chunkResult.reason)) {
              hasRateLimitError = true
            }
          }
        })

        if (!hasRateLimitError) {
          break
        } else if (retryCount < maxRetries) {
          retryCount++
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        } else {
          break
        }
      } catch (error: any) {
        if (isRateLimit && isRateLimit(error) && retryCount < maxRetries) {
          retryCount++
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        } else {
          chunk.forEach((item) => {
            results.push({
              item,
              success: false,
              error: error?.message || 'Unknown error'
            })
            failed++
          })
          break
        }
      }
    }
  }

  const finalResults = {
    results,
    successCount: results.filter(r => r.success).length,
    failedCount: results.filter(r => !r.success).length,
    totalCount
  }

  onBatchComplete?.(results)

  return finalResults
}
