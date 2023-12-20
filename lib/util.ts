import { CollectionId } from '@/reports/helpers/subject'

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
    ['TEXTAREA', 'INPUT', 'SELECT'].includes(htmlEl.tagName) &&
    !htmlEl.getAttribute('disabled')
  )
}

const blueSkyUrlMatcher = new RegExp('(https?://)?.*bsky.app')

export const isBlueSkyAppUrl = (url: string) => blueSkyUrlMatcher.test(url)

export const buildBlueSkyAppUrl = (
  params: { did: string } & ({ collection: string; rkey: string } | {}),
) => {
  let url = `https://bsky.app/profile`

  if ('did' in params) {
    url += `/${params.did}`
  }

  if ('collection' in params) {
    url += `/${params.collection}/${params.rkey}`
  }

  return url
}

export const getFragmentsFromBlueSkyAppUrl = (url: string) => {
  const fragments = url.match(blueSkyUrlMatcher)
  if (!fragments) return null

  const parts: { did?: string; handle?: string; cid?: string } = {}

  let postIndex = -1
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
    if (part === 'post' || part === CollectionId.Post) {
      postIndex = i
    }
  })

  if (postIndex >= 0) {
    parts.cid = identifiers[postIndex + 1]
  }

  return parts
}

export const isValidDid = (did?: string | null) => did?.startsWith('did:')
export const isValidHandle = (handle?: string | null) => handle?.includes('.')

export function unique<T>(arr: T[]) {
  return [...new Set(arr)]
}
