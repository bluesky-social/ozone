'use client'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Posts } from '../posts/Posts'
import { useEffect, useRef, useState } from 'react'
import { useRepoAndProfile } from '@/repositories/useRepoAndProfile'
import {
  Agent,
  AppBskyEmbedRecord,
  AppBskyFeedDefs,
  AppBskyFeedGetAuthorFeed,
} from '@atproto/api'
import { TypeFilterKey, TypeFiltersByKey } from '../posts/constants'
import { useAppviewAgent, useLabelerAgent } from '@/shell/ConfigurationContext'
import { ConfirmationModal } from '../modals/confirmation'
import { ActionButton } from '../buttons'
import { useWorkspaceAddItemsMutation } from '@/workspace/hooks'
import { toast } from 'react-toastify'

const getAuthorFeed =
  ({
    query,
    labelerAgent,
    appviewAgent,
    typeFilter,
    repoHandle,
    actor,
  }: {
    query: string
    labelerAgent: Agent
    appviewAgent: Agent | null
    typeFilter: TypeFilterKey
    repoHandle?: string
    actor: string
  }) =>
  async (
    { pageParam }: { pageParam?: string },
    options: { signal?: AbortSignal } = {},
  ) => {
    let isFromAppview = false
    const searchPosts = query.length && repoHandle
    if (searchPosts) {
      const { data } = await labelerAgent.app.bsky.feed.searchPosts(
        {
          q: `from:${repoHandle} ${query}`,
          limit: 30,
          cursor: pageParam,
        },
        options,
      )
      return {
        ...data,
        feed: data.posts.map((post) => ({ post })),
        isFromAppview,
      }
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
        actor,
        cursor,
        ...(isPostFilter ? { filter: typeFilter } : {}),
      }
      let data: AppBskyFeedGetAuthorFeed.OutputSchema

      try {
        if (isFromAppview && appviewAgent) {
          const authorFeedThroughAppview =
            await appviewAgent.app.bsky.feed.getAuthorFeed(
              authorFeedParams,
              options,
            )
          data = authorFeedThroughAppview.data
        } else {
          const authorFeedThroughOzone =
            await labelerAgent.app.bsky.feed.getAuthorFeed(
              authorFeedParams,
              options,
            )
          data = authorFeedThroughOzone.data
        }
      } catch (e) {
        if (
          e instanceof AppBskyFeedGetAuthorFeed.BlockedByActorError &&
          appviewAgent
        ) {
          const authorFeedThroughAppview =
            await appviewAgent.app.bsky.feed.getAuthorFeed(
              authorFeedParams,
              options,
            )
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
        if (typeFilter === TypeFiltersByKey.reposts.key) {
          return AppBskyFeedDefs.isReasonRepost(item.reason)
        }
        if (typeFilter === TypeFiltersByKey.no_reposts.key) {
          return !AppBskyFeedDefs.isReasonRepost(item.reason)
        }
        if (typeFilter === TypeFiltersByKey.quotes.key) {
          // When a quoted post is reposted, we don't want to consider that a quote post
          return (
            AppBskyEmbedRecord.isView(item.post.embed) &&
            !AppBskyFeedDefs.isReasonRepost(item.reason)
          )
        }
        return (
          AppBskyFeedDefs.isReasonRepost(item.reason) ||
          AppBskyEmbedRecord.isView(item.post.embed)
        )
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
  }

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

  const abortController = useRef<AbortController | null>(null)
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const { mutate: addToWorkspace } = useWorkspaceAddItemsMutation()

  const getAuthorFeedPage = getAuthorFeed({
    query,
    actor: id,
    labelerAgent,
    appviewAgent,
    typeFilter,
    repoHandle: repoData?.repo?.handle,
  })

  useEffect(() => {
    if (!isConfirmationOpen) {
      abortController.current?.abort('user-cancelled')
    }
  }, [isConfirmationOpen])

  useEffect(() => {
    // User cancelled by closing this view (navigation, other?)
    return () => abortController.current?.abort('user-cancelled')
  }, [])

  const authorFeedQueryResult = useInfiniteQuery({
    queryKey: ['authorFeed', { id, query, typeFilter }],
    queryFn: getAuthorFeedPage,
    getNextPageParam: (lastPage) => lastPage.cursor,
  })

  const items =
    authorFeedQueryResult.data?.pages.flatMap((page) => page.feed) ?? []
  const isFromAppview = authorFeedQueryResult.data?.pages.some(
    (page) => page.isFromAppview,
  )

  const confirmAddToWorkspace = async () => {
    // add items that are already loaded
    await addToWorkspace(items.map((i) => i.post.uri))
    if (!authorFeedQueryResult.data?.pageParams) {
      setIsConfirmationOpen(false)
      return
    }
    setIsAdding(true)
    const newAbortController = new AbortController()
    abortController.current = newAbortController

    try {
      let cursor = authorFeedQueryResult.data.pageParams[0] as
        | string
        | undefined
      do {
        // When we just want the dids of the users, no need to do an extra fetch to include repos
        const nextPage = await getAuthorFeedPage(
          { pageParam: cursor },
          { signal: abortController.current?.signal },
        )
        const uris = nextPage.feed.map((f) => f.post.uri)
        if (uris.length) await addToWorkspace(uris)
        cursor = nextPage.cursor
        //   if the modal is closed, that means the user decided not to add any more user to workspace
      } while (cursor && isConfirmationOpen)
    } catch (e) {
      if (abortController.current?.signal.reason === 'user-cancelled') {
        toast.info('Stopped adding posts to workspace')
      } else {
        toast.error(`Something went wrong: ${(e as Error).message}`)
      }
    }
    setIsAdding(false)
    setIsConfirmationOpen(false)
  }

  return {
    items,
    isFromAppview,
    setIsConfirmationOpen,
    isAdding,
    setIsAdding,
    confirmAddToWorkspace,
    isConfirmationOpen,
    fetchNextPage: authorFeedQueryResult.fetchNextPage,
    hasNextPage: authorFeedQueryResult.hasNextPage,
    isFetching: authorFeedQueryResult.isFetching,
  }
}

export function AuthorFeed({
  id,
  onReport,
  isAuthorDeactivated,
  isAuthorTakendown,
}: {
  id: string
  isAuthorDeactivated: boolean
  isAuthorTakendown: boolean
  onReport: (uri: string) => void
}) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilterKey>('no_filter')

  const {
    items,
    isFromAppview,
    setIsConfirmationOpen,
    isAdding,
    isFetching,
    hasNextPage,
    fetchNextPage,
    setIsAdding,
    confirmAddToWorkspace,
    isConfirmationOpen,
  } = useAuthorFeedQuery({
    id,
    query,
    typeFilter,
  })
  return (
    <>
      <div className="mx-auto max-w-3xl w-full py-2 sm:px-6 lg:px-8">
        <div className="flex-1 text-right">
          <ActionButton
            size="sm"
            disabled={!items?.length}
            title={
              !items.length
                ? 'No posts to be added to workspace'
                : 'All posts will be added to workspace'
            }
            appearance={!!items.length ? 'primary' : 'outlined'}
            onClick={() => setIsConfirmationOpen(true)}
          >
            Add all to workspace
          </ActionButton>
          <ConfirmationModal
            onConfirm={() => {
              if (isAdding) {
                setIsAdding(false)
                setIsConfirmationOpen(false)
                return
              }

              confirmAddToWorkspace()
            }}
            isOpen={isConfirmationOpen}
            setIsOpen={setIsConfirmationOpen}
            confirmButtonText={isAdding ? 'Stop adding' : 'Yes, add all'}
            title={`Add to workspace?`}
            description={
              <>
                Once confirmed, all posts from this user will be added to the
                workspace. If there are a lot of posts, this may take quite some
                time but you can always stop the process and already added posts
                will remain in the workspace.
              </>
            }
          />
        </div>
      </div>
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
        isAuthorDeactivated={isAuthorDeactivated}
        isAuthorTakendown={isAuthorTakendown}
      />
    </>
  )
}
