import { AtUri, BlobRef, jsonToLex } from '@atproto/api'

// Records and snapshots may contain extensions or malformed fields, so every
// read is defensive and the raw JSON stays available for review.
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

// Returns a normalized URL only for plain HTTP(S) links without credentials;
// anything else should be shown as text rather than made clickable.
export function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return null
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null
  } catch {
    return null
  }
}

export function imageBlobCid(value: unknown): string | null {
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

export function textList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
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
