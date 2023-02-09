export function classNames(...classes: string[]) {
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
