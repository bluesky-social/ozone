import {
  AppBskyEmbedRecord,
  AppBskyFeedDefs,
  AppBskyFeedPost,
} from '@atproto/api'
import { TypeFilterKey, TypeFiltersByKey } from './constants'

// These filters are not supported by app.bsky.feed.getAuthorFeed so they are
// applied on the client side after fetching the unfiltered author feed
const clientSideTypeFilters: TypeFilterKey[] = [
  TypeFiltersByKey.replies.key,
  TypeFiltersByKey.no_reposts.key,
  TypeFiltersByKey.reposts.key,
  TypeFiltersByKey.quotes.key,
  TypeFiltersByKey.quotes_and_reposts.key,
]

export const isClientSideTypeFilter = (typeFilter: TypeFilterKey) =>
  clientSideTypeFilters.includes(typeFilter)

export const matchesTypeFilter = (
  item: AppBskyFeedDefs.FeedViewPost,
  typeFilter: TypeFilterKey,
): boolean => {
  const isRepost = AppBskyFeedDefs.isReasonRepost(item.reason)

  switch (typeFilter) {
    case TypeFiltersByKey.replies.key:
      // A reposted reply was not authored by this account so it is excluded
      return (
        !isRepost &&
        AppBskyFeedPost.isRecord(item.post.record) &&
        !!item.post.record.reply
      )
    case TypeFiltersByKey.reposts.key:
      return isRepost
    case TypeFiltersByKey.no_reposts.key:
      return !isRepost
    case TypeFiltersByKey.quotes.key:
      // When a quoted post is reposted, we don't want to consider that a quote post
      return AppBskyEmbedRecord.isView(item.post.embed) && !isRepost
    case TypeFiltersByKey.quotes_and_reposts.key:
      return isRepost || AppBskyEmbedRecord.isView(item.post.embed)
    default:
      return true
  }
}
