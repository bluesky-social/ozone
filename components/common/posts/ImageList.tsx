import { AppBskyEmbedImages } from '@atproto/api'
import { useState } from 'react'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
import Lightbox from 'yet-another-react-lightbox'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails'

function ImageAltText({ alt }: { alt: string }) {
  if (!alt) return null
  return (
    <p className="leading-2 text-gray-400 text-xs leading-3 mt-1">
      <InformationCircleIcon className="w-4 h-4 inline mr-1" />
      {alt}
    </p>
  )
}

export const ImageList = ({
  images,
  imageClassName,
}: {
  imageClassName?: string
  images: AppBskyEmbedImages.ViewImage[]
}) => {
  const [lightboxImageIndex, setLightboxImageIndex] = useState(-1)

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
    }
  }

  return (
    <>
      <Lightbox
        open={lightboxImageIndex >= 0}
        plugins={[Thumbnails, Captions]}
        carousel={{ finite: true }}
        controller={{ closeOnBackdropClick: true }}
        close={() => setLightboxImageIndex(-1)}
        slides={images.map((img) => ({
          src: img.fullsize,
          description: img.alt,
        }))}
        index={lightboxImageIndex}
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
      {images.map((image, i) => (
        <figure key={image.thumb}>
          <button type="button" onClick={() => setLightboxImageIndex(i)}>
            <img className={imageClassName} src={image.thumb} alt={image.alt} />
          </button>
          <figcaption>
            <ImageAltText alt={image.alt} />
          </figcaption>
        </figure>
      ))}
    </>
  )
}
