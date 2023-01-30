'use client'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Posts } from '../posts/Posts'
import client from '../../../lib/client'

export function AuthorFeed({
  id,
  title,
  onReport,
}: {
  id: string
  title: string
  onReport: (uri: string) => void
}) {
  const { data, fetchNextPage } = useInfiniteQuery({
    queryKey: ['authorFeed', { id }],
    queryFn: async ({ pageParam }) => {
      const { data } = await client.api.app.bsky.feed.getAuthorFeed({
        author: id,
        limit: 30,
        before: pageParam,
      })
      return data
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })
  const items = data?.pages.flatMap((page) => page.feed) ?? []
  return (
    <Posts
      title={title}
      items={items}
      onReport={onReport}
      onLoadMore={() => fetchNextPage()}
    />
  )
}
