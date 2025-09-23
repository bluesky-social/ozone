import { copyToClipboard } from '@/common/CopyButton'
import {
  AppBskyEmbedImages,
  AppBskyEmbedRecordWithMedia,
  asPredicate,
  ToolsOzoneModerationDefs,
} from '@atproto/api'

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
      if (asPredicate(AppBskyEmbedImages.validateMain)(record.value.embed)) {
        record.value.embed.images.forEach((img, i) => {
          data += `Image ${i + 1} ALT: ${img.alt}\n`
        })
      }
      if (
        asPredicate(AppBskyEmbedRecordWithMedia.validateMain)(
          record.value.embed,
        ) &&
        asPredicate(AppBskyEmbedImages.validateMain)(record.value.embed.media)
      ) {
        record.value.embed.media.images.forEach((img, i) => {
          data += `Image ${i + 1} ALT: ${img.alt}\n`
        })
      }
    }
    copyToClipboard(data, 'record details')
  }
}
