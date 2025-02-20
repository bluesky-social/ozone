import {
  AppBskyEmbedExternal,
  AppBskyEmbedImages,
  AppBskyEmbedRecord,
  AppBskyEmbedRecordWithMedia,
  AppBskyEmbedVideo,
  AppBskyFeedPost,
  AppBskyGraphDefs,
  asPredicate,
} from '@atproto/api'

export const isEmbedVideoView = asPredicate(AppBskyEmbedVideo.validateView)
export const isEmbedImagesView = asPredicate(AppBskyEmbedImages.validateView)
export const isEmbedExternalView = asPredicate(
  AppBskyEmbedExternal.validateView,
)
export const isEmbedRecordWithMediaView = asPredicate(
  AppBskyEmbedRecordWithMedia.validateView,
)
export const isEmbedRecordView = asPredicate(AppBskyEmbedRecord.validateView)
export const isPostRecord = asPredicate(AppBskyFeedPost.validateRecord)
export const isListView = asPredicate(AppBskyGraphDefs.validateListView)
export const isEmbedRecordViewNotFound = asPredicate(
  AppBskyEmbedRecord.validateViewNotFound,
)
export const isEmbedRecordViewBlocked = asPredicate(
  AppBskyEmbedRecord.validateViewBlocked,
)
