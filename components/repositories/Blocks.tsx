import { LoadMoreButton } from '@/common/LoadMoreButton'
import client from '@/lib/client'
import { AppBskyActorDefs } from '@atproto/api'
import { useInfiniteQuery } from '@tanstack/react-query'
import { AccountsGrid } from './AccountView'
import { listRecords } from './api'

export function Blocks({ did }: { did: string }) {
  const { data, error, fetchNextPage, hasNextPage, refetch, isInitialLoading } =
    useInfiniteQuery({
      queryKey: ['blocks', { did }],
      queryFn: async ({ pageParam }) => {
        const data = await listRecords(did, 'app.bsky.graph.block', {
          cursor: pageParam,
        })
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
