import {
  $Typed,
  AppBskyEmbedExternal,
  AppBskyEmbedImages,
  AppBskyEmbedRecord,
  AppBskyEmbedRecordWithMedia,
  AppBskyEmbedVideo,
  AppBskyFeedDefs,
  AppBskyFeedPost,
} from '@atproto/api'

export const isValidPostRecord = (record: unknown) => {
  const result = AppBskyFeedPost.validateRecord(record)
  if (result.success) {
    return result.success
  }

  // @TODO: Temp hack to bypass blob validation failing for valid records
  if (result.error.message.includes('should be a blob ref')) {
    return true
  }

  return false
}

export type KnownEmbedView =
  | $Typed<AppBskyEmbedExternal.View>
  | $Typed<AppBskyEmbedImages.View>
  | $Typed<AppBskyEmbedRecord.View>
  | $Typed<AppBskyEmbedVideo.View>

export function extractEmbeds(
  post: AppBskyFeedDefs.PostView,
): (KnownEmbedView | { $type: string } | undefined)[] {
  return AppBskyEmbedRecordWithMedia.isView(post.embed)
    ? [post.embed.media, post.embed.record.record]
    : [post.embed]
}
