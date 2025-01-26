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
