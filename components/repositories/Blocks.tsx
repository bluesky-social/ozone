import { LoadMoreButton } from '@/common/LoadMoreButton'
import client from '@/lib/client'
import { getServiceUrlFromDoc } from '@/lib/client-config'
import { resolveDidDocData } from '@/lib/identity'
import { AppBskyActorDefs } from '@atproto/api'
import { useInfiniteQuery } from '@tanstack/react-query'
import { AccountsGrid } from './AccountView'

export function Blocks({ did }: { did: string }) {
  const { data, error, fetchNextPage, hasNextPage, refetch, isInitialLoading } =
    useInfiniteQuery({
      queryKey: ['blocks', { did }],
      queryFn: async ({ pageParam }) => {
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
        url.searchParams.set('collection', 'app.bsky.graph.block')
        url.searchParams.set('limit', `25`)
        url.searchParams.set('cursor', pageParam)
        const res = await fetch(url)
        const data = await res.json()
        console.log(data)
        const actors = data.records.map(
          (record) => record.value['subject'] as string,
        )
        if (!actors.length) {
          return { accounts: [], cursor: null }
        }
        const { data: profileData } =
          await client.api.app.bsky.actor.getProfiles(
            {
              actors,
            },
            { headers: client.proxyHeaders() },
          )

        const accounts: AppBskyActorDefs.ProfileViewDetailed[] = []
        actors.forEach((did) => {
          const profile = profileData.profiles.find((p) => p.did === did)
          if (profile) {
            accounts.push(profile)
          }
        })

        return {
          accounts,
          cursor: data.cursor,
        }
      },
      getNextPageParam: (lastPage) => lastPage.cursor,
    })
  const blockedAccounts = data?.pages.flatMap((page) => page.accounts) ?? []
  return (
    <div>
      <AccountsGrid
        isLoading={isInitialLoading}
        error={String(error ?? '')}
        accounts={blockedAccounts}
      />

      {hasNextPage && (
        <div className="flex justify-center py-6">
          <LoadMoreButton onClick={() => fetchNextPage()} />
        </div>
      )}
    </div>
  )
}
