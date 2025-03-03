import { getServiceUrlFromDoc } from '@/lib/client-config'
import { resolveDidDocData } from '@/lib/identity'
import { chunkArray } from '@/lib/util'
import { Agent, AppBskyActorDefs } from '@atproto/api'

export async function listRecords(
  did: string,
  collection: string,
  { cursor, limit = 25 }: { cursor?: string; limit?: number },
  options?: { signal?: AbortSignal },
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
  const res = await fetch(url, options)
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
