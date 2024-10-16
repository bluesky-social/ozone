'use client'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Posts } from '../posts/Posts'
import { useState } from 'react'
import { useRepoAndProfile } from '@/repositories/useRepoAndProfile'
import { AppBskyFeedDefs, AppBskyFeedGetAuthorFeed } from '@atproto/api'
import { TypeFilterKey, TypeFiltersByKey } from '../posts/constants'
import { useAppviewAgent, useLabelerAgent } from '@/shell/ConfigurationContext'

export const useAuthorFeedQuery = ({
  id,
  query,
  typeFilter,
}: {
  id: string
  query: string
  typeFilter: TypeFilterKey
}) => {
  const { data: repoData } = useRepoAndProfile({ id })
  const labelerAgent = useLabelerAgent()
  const appviewAgent = useAppviewAgent()

  return useInfiniteQuery({
    queryKey: ['authorFeed', { id, query, typeFilter }],
    queryFn: async ({ pageParam }) => {
      let isFromAppview = false
      const searchPosts = query.length && repoData?.repo.handle
      if (searchPosts) {
        const { data } = await labelerAgent.app.bsky.feed.searchPosts({
          q: `from:${repoData?.repo.handle} ${query}`,
          limit: 30,
          cursor: pageParam,
        })
        return { ...data, feed: data.posts.map((post) => ({ post })) }
      }

      const limit = 30
      let filteredFeed: AppBskyFeedDefs.FeedViewPost[] = []
      let cursor = pageParam
      const isPostFilter = [
        TypeFiltersByKey.posts_no_replies.key,
        TypeFiltersByKey.posts_with_media.key,
      ].includes(typeFilter)
      const isQuoteOrRepostFilter = [
        TypeFiltersByKey.no_reposts.key,
        TypeFiltersByKey.reposts.key,
        TypeFiltersByKey.quotes.key,
        TypeFiltersByKey.quotes_and_reposts.key,
      ].includes(typeFilter)

      while (filteredFeed.length < limit) {
        const authorFeedParams = {
          limit,
          actor: id,
          cursor,
          ...(isPostFilter ? { filter: typeFilter } : {}),
        }
        let data: AppBskyFeedGetAuthorFeed.OutputSchema

        try {
          if (isFromAppview && appviewAgent) {
            const authorFeedThroughAppview =
              await appviewAgent.app.bsky.feed.getAuthorFeed(authorFeedParams)
            data = authorFeedThroughAppview.data
          } else {
            const authorFeedThroughOzone =
              await labelerAgent.app.bsky.feed.getAuthorFeed(authorFeedParams)
            data = authorFeedThroughOzone.data
          }
        } catch (e) {
          if (
            e instanceof AppBskyFeedGetAuthorFeed.BlockedByActorError &&
            appviewAgent
          ) {
            const authorFeedThroughAppview =
              await appviewAgent.app.bsky.feed.getAuthorFeed(authorFeedParams)
            data = authorFeedThroughAppview.data
            if (!isFromAppview) isFromAppview = true
          } else {
            throw e
          }
        }

        if (!data) {
          break
        }

        // Only repost/quote post filters are applied on the client side
        if (!isQuoteOrRepostFilter) {
          return { ...data, isFromAppview }
        }

        const newFilteredItems = data.feed.filter((item) => {
          const isRepost =
            item.reason?.$type === 'app.bsky.feed.defs#reasonRepost'
          const isQuotePost =
            item.post.embed?.$type === 'app.bsky.embed.record#view'
          if (typeFilter === TypeFiltersByKey.reposts.key) {
            return isRepost
          }
          if (typeFilter === TypeFiltersByKey.no_reposts.key) {
            return !isRepost
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
      return { feed: filteredFeed, cursor, isFromAppview }
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })
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

  const { data, fetchNextPage, hasNextPage, isFetching } = useAuthorFeedQuery({
    id,
    query,
    typeFilter,
  })
  const items = data?.pages.flatMap((page) => page.feed) ?? []
  const isFromAppview = data?.pages.some((page) => page.isFromAppview)

  return (
    <Posts
      isFromAppview={isFromAppview}
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
