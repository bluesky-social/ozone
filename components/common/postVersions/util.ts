import { format } from 'date-fns'
import { PostVersion } from '@/lib/postVersions'

/**
 * When this version became visible: the edit time for edits, the original
 * index time for the original.
 */
export function getVersionTime(version: PostVersion) {
  return version.editedAt ?? version.indexedAt
}

export function formatVersionTime(version: PostVersion) {
  return format(new Date(getVersionTime(version)), 'MMM d, yyyy h:mm:ss a')
}

/**
 * How long after the original post an edit was made, e.g. "1m 42s after
 * posting". Undefined for the original.
 */
export function formatEditDelay(version: PostVersion) {
  if (!version.editedAt) return undefined
  const seconds = Math.max(
    0,
    Math.round(
      (new Date(version.editedAt).getTime() -
        new Date(version.indexedAt).getTime()) /
        1000,
    ),
  )
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  const delay = minutes ? `${minutes}m ${rest}s` : `${rest}s`
  return `${delay} after posting`
}
