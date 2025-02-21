import {
  $Typed,
  AppBskyEmbedExternal,
  AppBskyEmbedImages,
  AppBskyEmbedRecord,
  AppBskyEmbedRecordWithMedia,
  AppBskyEmbedVideo,
  AppBskyFeedDefs,
  AppBskyFeedPost,
  asPredicate,
} from '@atproto/api'

export const isValidPostRecord = asPredicate(AppBskyFeedPost.validateRecord)

export type KnownEmbedView =
  | $Typed<AppBskyEmbedExternal.View>
  | $Typed<AppBskyEmbedImages.View>
  | $Typed<AppBskyEmbedRecord.View>
  | $Typed<AppBskyEmbedVideo.View>

export function extractEmbed(
  post: AppBskyFeedDefs.PostView,
): KnownEmbedView | { $type: string } | undefined {
  return AppBskyEmbedRecordWithMedia.isView(post.embed)
    ? post.embed.media
    : post.embed
}
