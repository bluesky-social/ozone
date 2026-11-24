import { getServiceUrlFromDoc } from '@/lib/client-config'
import { resolveDidDocData } from '@/lib/identity'
import { chunkArray } from '@/lib/util'
import { Agent, AppBskyActorDefs, CredentialSession } from '@atproto/api'

/**
 * Lists a repo's records straight from the account's PDS.
 *
 * When `pdsAgent` is given and the account lives on the PDS that the
 * signed-in moderator's own session belongs to, the request is made through
 * that session, so a PDS that restricts anonymous reads still answers. The
 * session only ever talks to its own PDS: the request is handed to it as a
 * path, never as the URL built from the account's DID document, and a
 * redirect is refused, so the token cannot reach another host. Any other
 * account is read with no credential, as before.
 */
export async function listRecords(
  did: string,
  collection: string,
  { cursor, limit = 25 }: { cursor?: string; limit?: number },
  options?: { signal?: AbortSignal; pdsAgent?: Agent },
) {
  const doc = await resolveDidDocData(did)
  if (!doc) {
    throw new Error('Could not resolve DID doc')
  }
  const pdsUrl = getServiceUrlFromDoc(doc, 'atproto_pds')
  if (!pdsUrl) {
    throw new Error('Could not determine PDS service URL')
  }
  const url = new URL('/xrpc/com.atproto.repo.listRecords', pdsUrl)
  url.searchParams.set('repo', did)
  url.searchParams.set('collection', collection)
  url.searchParams.set('limit', `${limit}`)
  if (cursor) {
    url.searchParams.set('cursor', `${cursor}`)
  }
  const session = options?.pdsAgent?.sessionManager
  if (
    session instanceof CredentialSession &&
    session.dispatchUrl.origin === url.origin
  ) {
    const res = await session.fetchHandler(`${url.pathname}${url.search}`, {
      signal: options?.signal,
      redirect: 'error',
    })
    return res.json()
  }
  const res = await fetch(url, { signal: options?.signal })
  return res.json()
}

export const getProfiles = async (agent: Agent, dids?: string[]) => {
  const profiles = new Map<string, AppBskyActorDefs.ProfileViewDetailed>()

  if (!dids || dids.length === 0) {
    return profiles
  }

  for (const chunk of chunkArray(dids, 25)) {
    try {
      const { data } = await agent.app.bsky.actor.getProfiles({
        actors: chunk,
      })

      data.profiles.forEach((profile) => {
        profiles.set(profile.did, profile)
      })
      // If one of many chunks fail, don't let that stop the rest of the chunks
    } catch (err) {
      console.error('Error fetching profiles', err)
    }
  }

  return profiles
}
