import { copyToClipboard } from '@/common/CopyButton'
import {
  AppBskyEmbedGallery,
  AppBskyEmbedImages,
  AppBskyEmbedRecordWithMedia,
  asPredicate,
  ToolsOzoneModerationDefs,
} from '@atproto/api'

const galleryAltsText = (gallery: AppBskyEmbedGallery.Main): string => {
  let text = ''
  let i = 1
  for (const item of gallery.items) {
    if (AppBskyEmbedGallery.isImage(item)) {
      text += `Image ${i} ALT: ${item.alt}\n`
      i += 1
    }
  }
  return text
}

export const useCopyRecordDetails = ({
  record,
}: {
  record?: ToolsOzoneModerationDefs.RecordViewDetail
}) => {
  return () => {
    let data = ``
    if (record?.value) {
      data += `Created At: ${record.value.createdAt}\n`
      data += `Content: ${record.value.text}\n`
      const embed = record.value.embed
      if (asPredicate(AppBskyEmbedImages.validateMain)(embed)) {
        embed.images.forEach((img, i) => {
          data += `Image ${i + 1} ALT: ${img.alt}\n`
        })
      } else if (asPredicate(AppBskyEmbedGallery.validateMain)(embed)) {
        data += galleryAltsText(embed)
      } else if (
        asPredicate(AppBskyEmbedRecordWithMedia.validateMain)(embed)
      ) {
        if (asPredicate(AppBskyEmbedImages.validateMain)(embed.media)) {
          embed.media.images.forEach((img, i) => {
            data += `Image ${i + 1} ALT: ${img.alt}\n`
          })
        } else if (
          asPredicate(AppBskyEmbedGallery.validateMain)(embed.media)
        ) {
          data += galleryAltsText(embed.media)
        }
      }
    }
    copyToClipboard(data, 'record details')
  }
}
