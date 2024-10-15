import { LoadMoreButton } from '@/common/LoadMoreButton'
import { AppBskyActorDefs } from '@atproto/api'
import { useInfiniteQuery } from '@tanstack/react-query'
import { AccountsGrid } from './AccountView'
import { listRecords } from './api'
import { useLabelerAgent } from '@/shell/ConfigurationContext'

export function Blocks({ did }: { did: string }) {
  const labelerAgent = useLabelerAgent()

  const { data, error, fetchNextPage, hasNextPage, isInitialLoading } =
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
          await labelerAgent.api.app.bsky.actor.getProfiles({
            actors,
          })

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
