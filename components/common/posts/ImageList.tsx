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
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)
  return (
    <>
      <Lightbox
        open={isImageViewerOpen}
        plugins={[Thumbnails, Captions]}
        carousel={{ finite: true }}
        close={() => setIsImageViewerOpen(false)}
        slides={images.map((img) => ({
          src: img.fullsize,
          description: img.alt,
        }))}
      />
      {images.map((image, i) => (
        <figure key={image.thumb}>
          <button type="button" onClick={() => setIsImageViewerOpen(true)}>
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
