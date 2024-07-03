import client from '@/lib/client'
import { AccountsGrid } from '@/repositories/AccountView'
import { useInfiniteQuery } from '@tanstack/react-query'
import { LoadMoreButton } from '../LoadMoreButton'

const useReposts = (uri: string, cid?: string) => {
  return useInfiniteQuery({
    queryKey: ['reposts', { uri, cid }],
    queryFn: async ({ pageParam }) => {
      const { data } = await client.api.app.bsky.feed.getRepostedBy({
        uri,
        cid,
        limit: 50,
        cursor: pageParam,
      })
      return data
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })
}

export const Reposts = ({ uri, cid }: { uri: string; cid?: string }) => {
  const { data, fetchNextPage, hasNextPage } = useReposts(uri, cid)
  const accounts = data?.pages.flatMap((page) => page.repostedBy) || []
  return (
    <>
      <AccountsGrid error="" accounts={accounts} />
      {hasNextPage && (
        <div className="flex justify-center">
          <LoadMoreButton onClick={() => fetchNextPage()} />
        </div>
      )}
    </>
  )
}
