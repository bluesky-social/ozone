import { AtUri, BlobRef, jsonToLex } from '@atproto/api'

// Documents and snapshots may contain extensions or malformed fields.
export function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export const asText = (value: unknown) =>
  typeof value === 'string' ? value : undefined

export function recordReference(value: unknown, collection: string) {
  if (typeof value !== 'string' || !value.startsWith('at://')) return null
  try {
    const uri = new AtUri(value)
    return uri.collection === collection && uri.rkey && !uri.search && !uri.hash
      ? uri
      : null
  } catch {
    return null
  }
}

export function documentUrl(site: unknown, path: unknown): string | null {
  if (typeof site !== 'string' || !/^https?:\/\//i.test(site)) return null
  if (
    path !== undefined &&
    (typeof path !== 'string' || !path.startsWith('/'))
  ) {
    return null
  }
  try {
    const base = new URL(site)
    if (
      !['http:', 'https:'].includes(base.protocol) ||
      base.search ||
      base.hash
    ) {
      return null
    }
    if (path === undefined) return base.href
    // Concatenate as the lexicon specifies: URL resolution would discard a
    // publication's base path, or let a //path replace the destination host.
    return new URL(`${base.href.replace(/\/+$/, '')}${path}`).href
  } catch {
    return null
  }
}

export function coverImageCid(value: unknown): string | null {
  try {
    // Live XRPC responses decode blobs; saved snapshots retain JSON $link refs.
    const blob = value instanceof BlobRef ? value : jsonToLex(value)
    return blob instanceof BlobRef && blob.mimeType.startsWith('image/')
      ? blob.ref.toString()
      : null
  } catch {
    return null
  }
}
