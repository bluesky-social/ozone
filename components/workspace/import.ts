import {
  AtUri,
  isAtUriString,
  isValidDid,
  isValidHandle,
} from '@atproto/syntax'
import { getDidFromHandleInBatch } from '@/lib/identity'

type WorkspaceItem = { actor: string; path: string }

function parseWorkspaceItem(input: string): WorkspaceItem {
  let actor = input
  let path = ''

  try {
    if (input.startsWith('at://')) {
      if (!isAtUriString(input)) throw new Error()
      const uri = new AtUri(input)
      if (!uri.collection || !uri.rkey || uri.hash || uri.search) {
        throw new Error()
      }
      actor = uri.hostname
      path = uri.pathname
    } else if (!isValidDid(input) && !isValidHandle(input)) {
      const url = new URL(input)
      if (
        !['https:', 'http:'].includes(url.protocol) ||
        url.host !== 'bsky.app' ||
        url.username ||
        url.password
      ) {
        throw new Error()
      }
      const match = url.pathname.match(
        /^\/profile\/([^/]+)(?:\/post\/([^/]+))?\/?$/,
      )
      if (!match) throw new Error()
      actor = decodeURIComponent(match[1])
      if (match[2]) {
        path = `/app.bsky.feed.post/${decodeURIComponent(match[2])}`
        if (!isAtUriString(`at://${actor}${path}`)) throw new Error()
      }
    }

    if (!isValidDid(actor) && !isValidHandle(actor)) throw new Error()
    return { actor: isValidDid(actor) ? actor : actor.toLowerCase(), path }
  } catch {
    throw new Error(`Invalid workspace item: ${input}`)
  }
}

/**
 * Prepares workspace items by parsing them, resolving handles to DIDs, and returning unique subjects.
 */
export async function prepareWorkspaceItems(
  items: string[],
): Promise<string[]> {
  const parsed = items
    .map((item) => item.trim())
    .filter(Boolean)
    .map(parseWorkspaceItem)
  if (parsed.length === 0) throw new Error('Enter at least one workspace item')

  const handles = [
    ...new Set(
      parsed.map(({ actor }) => actor).filter((actor) => !isValidDid(actor)),
    ),
  ]
  const resolved = await getDidFromHandleInBatch(handles)
  const subjects = parsed.map(({ actor, path }) => {
    const did = isValidDid(actor) ? actor : resolved[actor]
    if (!did || !isValidDid(did)) {
      throw new Error(`Could not resolve handle: ${actor}`)
    }
    return path ? `at://${did}${path}` : did
  })

  return [...new Set(subjects)]
}
