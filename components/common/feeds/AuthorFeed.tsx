'use client'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Posts } from '../posts/Posts'
import client from '@/lib/client'
import { useState } from 'react'
import { useRepoAndProfile } from '@/repositories/useRepoAndProfile'
import { AppBskyFeedDefs } from '@atproto/api'
import { TypeFilterKey, TypeFiltersByKey } from '../posts/constants'

const getAuthorFeed = async ({ id, pageParam, typeFilter, options }) => {
  const limit = 30
  let filteredFeed: AppBskyFeedDefs.FeedViewPost[] = []
  let cursor = pageParam
  const isPostFilter = [
    TypeFiltersByKey.posts_no_replies.key,
    TypeFiltersByKey.posts_with_media.key,
  ].includes(typeFilter)
  const isQuoteOrRepostFilter = [
    TypeFiltersByKey.reposts.key,
    TypeFiltersByKey.quotes.key,
    TypeFiltersByKey.quotes_and_reposts.key,
  ].includes(typeFilter)

  while (filteredFeed.length < limit) {
    const { data } = await client.api.app.bsky.feed.getAuthorFeed(
      {
        limit,
        actor: id,
        cursor,
        ...(isPostFilter ? { filter: typeFilter } : {}),
      },
      options,
    )

    // Only repost/quote post filters are applied on the client side
    if (!isQuoteOrRepostFilter) {
      return data
    }

    const newFilteredItems = data.feed.filter((item) => {
      const isRepost = item.reason?.$type === 'app.bsky.feed.defs#reasonRepost'
      const isQuotePost =
        item.post.embed?.$type === 'app.bsky.embed.record#view'
      if (typeFilter === TypeFiltersByKey.reposts.key) {
        return isRepost
      }
      if (typeFilter === TypeFiltersByKey.quotes.key) {
        // When a quoted post is reposted, we don't want to consider that a quote post
        return isQuotePost && !isRepost
      }
      return isRepost || isQuotePost
    })

    filteredFeed = [...filteredFeed, ...newFilteredItems]

    // If no more items are available, break the loop to prevent infinite requests
    if (!data.cursor) {
      break
    }

    cursor = data.cursor
  }

  // Ensure the feed is exactly 30 items if there are more than 30
  return { feed: filteredFeed, cursor }
}

export function AuthorFeed({
  id,
  onReport,
}: {
  id: string
  onReport: (uri: string) => void
}) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilterKey>('no_filter')
  const { data: repoData } = useRepoAndProfile({ id })
  const { data, fetchNextPage, hasNextPage, isFetching } = useInfiniteQuery({
    queryKey: ['authorFeed', { id, query, typeFilter }],
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
        const data = await getAuthorFeed({
          id,
          pageParam,
          typeFilter,
          options,
        })
        return data
      }
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })
  const items = data?.pages.flatMap((page) => page.feed) ?? []

  return (
    <Posts
      items={items}
      searchQuery={query}
      setSearchQuery={setQuery}
      onReport={onReport}
      isFetching={isFetching}
      onLoadMore={hasNextPage ? () => fetchNextPage() : undefined}
      typeFilter={typeFilter}
      setTypeFilter={setTypeFilter}
    />
  )
}
