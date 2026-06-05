import { AppBskyEmbedGallery } from '@atproto/api'
import { useState } from 'react'
import {
  ExclamationCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import Lightbox from 'yet-another-react-lightbox'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails'
import { classNames } from '@/lib/util'

// Mirrors `getImageSizeClass` in PostsFeed.tsx so gallery thumbnails align
// visually with `app.bsky.embed.images` thumbnails. Width is applied to the
// surrounding <figure> as well as the <img> so the figcaption (alt text)
// wraps within the thumbnail's footprint and doesn't stretch the flex item.
const getThumbWidthClass = (imageCount: number) =>
  imageCount < 3 ? 'w-32' : 'w-20'
const getThumbHeightClass = (imageCount: number) =>
  imageCount < 3 ? 'h-32' : 'h-20'

// Cap rows at 5 thumbnails: 5 * w-20 (5rem) + 4 * gap-2 (0.5rem) = 27rem.
// Smaller item counts (and the w-32 size) naturally use less than this.
const MAX_ROW_WIDTH = 'max-w-[27rem]'

type GalleryEntry =
  | { kind: 'image'; item: AppBskyEmbedGallery.ViewImage; imageIndex: number }
  | { kind: 'unsupported'; $type: string }

function ImageAltText({ alt }: { alt: string }) {
  if (!alt) return null
  return (
    <p className="leading-2 text-gray-400 text-xs leading-3 mt-1">
      <InformationCircleIcon className="w-4 h-4 inline mr-1" />
      {alt}
    </p>
  )
}

function UnsupportedGalleryItem({
  $type,
  widthClass,
  heightClass,
}: {
  $type: string
  widthClass: string
  heightClass: string
}) {
  return (
    <div
      className={classNames(
        widthClass,
        heightClass,
        'flex items-center justify-center border-2 border-dashed border-gray-400 text-gray-500 dark:text-gray-300',
      )}
      title={`Unsupported gallery item: ${$type}`}
    >
      <ExclamationCircleIcon className="w-6 h-6" />
    </div>
  )
}

export const GalleryEmbed = ({
  embed,
  imageClassName,
}: {
  embed: AppBskyEmbedGallery.View
  imageClassName?: string
}) => {
  const [lightboxImageIndex, setLightboxImageIndex] = useState(-1)

  // Tag each item as image|unsupported preserving display order; track the
  // image-only index used by the lightbox slide list so clicks line up.
  const entries: GalleryEntry[] = []
  const images: AppBskyEmbedGallery.ViewImage[] = []
  for (const it of embed.items) {
    if (AppBskyEmbedGallery.isViewImage(it)) {
      entries.push({ kind: 'image', item: it, imageIndex: images.length })
      images.push(it)
    } else {
      entries.push({ kind: 'unsupported', $type: it.$type })
    }
  }

  const widthClass = getThumbWidthClass(entries.length)
  const heightClass = getThumbHeightClass(entries.length)
  const imgClassName = classNames(imageClassName, widthClass, heightClass)

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
    }
  }

  return (
    <div className="pb-2 pl-14">
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
      <div className={classNames('flex flex-wrap gap-2', MAX_ROW_WIDTH)}>
        {entries.map((entry, i) =>
          entry.kind === 'image' ? (
            <figure key={i} className={widthClass}>
              <button
                type="button"
                onClick={() => setLightboxImageIndex(entry.imageIndex)}
              >
                <img
                  className={imgClassName}
                  src={entry.item.thumbnail}
                  alt={entry.item.alt}
                />
              </button>
              <figcaption>
                <ImageAltText alt={entry.item.alt} />
              </figcaption>
            </figure>
          ) : (
            <UnsupportedGalleryItem
              key={i}
              $type={entry.$type}
              widthClass={widthClass}
              heightClass={heightClass}
            />
          ),
        )}
      </div>
    </div>
  )
}
