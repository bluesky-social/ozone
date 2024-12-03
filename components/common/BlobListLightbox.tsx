import { useServerConfig } from '@/shell/ConfigurationContext'
import { ToolsOzoneModerationDefs } from '@atproto/api'
import { useCallback } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails'

export const useBlobUrl = ({ authorDid }: { authorDid: string }) => {
  const { appview } = useServerConfig()
  const cdnUrl = appview?.endsWith('.bsky.app')
    ? 'https://cdn.bsky.app'
    : appview

  return useCallback(
    ({
      cid,
      isAvatar,
      size = 'fullsize',
    }: {
      cid: string
      isAvatar?: boolean
      size?: 'thumbnail' | 'fullsize'
    }) => {
      let sourcePath = isAvatar ? 'avatar' : 'feed'

      // avatar_fullsize doesn't exist, instead the default avatar/ serves the full size image
      if (!isAvatar && size !== 'fullsize') {
        sourcePath += `_${size}`
      }

      return `${cdnUrl}/img/feed_${size}/plain/${authorDid}/${cid}@jpeg`
    },
    [authorDid, cdnUrl],
  )
}

export const BlobListLightbox = ({
  authorDid,
  blobs,
  onClose,
  slideIndex,
}: {
  authorDid: string
  blobs: ToolsOzoneModerationDefs.BlobView[]
  onClose: () => void
  slideIndex: number
}) => {
  const getBlobUrl = useBlobUrl({ authorDid })
  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
    }
  }

  console.log(
    blobs.map((blob) => ({
      src: getBlobUrl({
        cid: blob.cid,
      }),
    })),
  )

  return (
    <Lightbox
      open={slideIndex >= 0}
      plugins={[Thumbnails, Captions]}
      carousel={{ finite: true }}
      controller={{ closeOnBackdropClick: true }}
      close={onClose}
      slides={blobs.map((blob) => ({
        src: getBlobUrl({
          cid: blob.cid,
        }),
      }))}
      index={slideIndex}
      on={{
        // The lightbox may open from other Dialog/modal components
        // in that case, we want to make sure that esc button presses
        // only close the lightbox and not the parent Dialog/modal underneath
        entered: () => {
          document.addEventListener('keydown', handleKeyDown)
        },
        exited: () => {
          document.removeEventListener('keydown', handleKeyDown)
        },
      }}
    />
  )
}
