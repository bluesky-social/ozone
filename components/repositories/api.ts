import { getServiceUrlFromDoc } from '@/lib/client-config'
import { resolveDidDocData } from '@/lib/identity'

export async function listRecords(
  did: string,
  collection: string,
  { cursor, limit = 25 }: { cursor?: string; limit?: number },
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
  const res = await fetch(url)
  return res.json()
}
