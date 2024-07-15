import client from '@/lib/client'
import { AccountsGrid } from '@/repositories/AccountView'
import { useInfiniteQuery } from '@tanstack/react-query'
import { LoadMoreButton } from '../LoadMoreButton'

const useLikes = (uri: string, cid?: string) => {
  return useInfiniteQuery({
    queryKey: ['likes', { uri, cid }],
    queryFn: async ({ pageParam }) => {
      const { data } = await client.api.app.bsky.feed.getLikes({
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

export const Likes = ({ uri, cid }: { uri: string; cid?: string }) => {
  const { data, fetchNextPage, hasNextPage } = useLikes(uri, cid)
  const likes = data?.pages.flatMap((page) => page.likes) || []
  return (
    <>
      <AccountsGrid error="" accounts={likes.map((l) => l.actor)} />
      {hasNextPage && (
        <div className="flex justify-center">
          <LoadMoreButton onClick={() => fetchNextPage()} />
        </div>
      )}
    </>
  )
}
