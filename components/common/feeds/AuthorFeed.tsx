'use client'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Posts } from '../posts/Posts'
import client from '@/lib/client'
import { useState } from 'react'
import { useRepoAndProfile } from '@/repositories/useRepoAndProfile'

export function AuthorFeed({
  id,
  onReport,
}: {
  id: string
  onReport: (uri: string) => void
}) {
  const [query, setQuery] = useState('')
  const { data: repoData } = useRepoAndProfile({ id })
  const { data, fetchNextPage, hasNextPage, isFetching } = useInfiniteQuery({
    queryKey: ['authorFeed', { id, query }],
    queryFn: async ({ pageParam }) => {
      const options = { headers: client.proxyHeaders() }
      const searchPosts = query.length && repoData?.repo.handle
      if (searchPosts) {
        const { data } = await client.api.app.bsky.feed.searchPosts(
          {
            q: `from:${repoData?.repo.handle} ${query}`,
            limit: 30,
            cursor: pageParam,
          },
          options,
        )
        return { ...data, feed: data.posts.map((post) => ({ post })) }
      } else {
        const { data } = await client.api.app.bsky.feed.getAuthorFeed(
          {
            actor: id,
            limit: 30,
            cursor: pageParam,
          },
          options,
        )
        return data
      }
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })
  const items = data?.pages.flatMap((page) => page.feed) ?? []

  return (
    <Posts
      items={items}
      setSearchQuery={setQuery}
      onReport={onReport}
      isFetching={isFetching}
      onLoadMore={hasNextPage ? () => fetchNextPage() : undefined}
    />
  )
}
