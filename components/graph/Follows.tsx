import { LoadMoreButton } from '@/common/LoadMoreButton'
import { AccountsGrid } from '@/repositories/AccountView'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useInfiniteQuery } from '@tanstack/react-query'

export function Follows({ id }: { id: string }) {
  const labelerAgent = useLabelerAgent()
  const { error, data, isLoading, fetchNextPage, hasNextPage } =
    useInfiniteQuery({
      queryKey: ['follows', { id }],
      queryFn: async ({ pageParam }) => {
        const { data } = await labelerAgent.api.app.bsky.graph.getFollows({
          actor: id,
          cursor: pageParam,
        })
        return data
      },
      getNextPageParam: (lastPage) => lastPage.cursor,
    })
  const follows = data?.pages.flatMap((page) => page.follows) ?? []
  return (
    <div>
      <AccountsGrid
        isLoading={isLoading}
        error={String(error ?? '')}
        accounts={follows}
      />

      {hasNextPage && (
        <div className="flex justify-center mb-4">
          <LoadMoreButton onClick={() => fetchNextPage()} />
        </div>
      )}
    </div>
  )
}
