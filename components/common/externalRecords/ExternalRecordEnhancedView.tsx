'use client'
import { ReactNode } from 'react'
import { AppBskyEmbedExternal } from '@atproto/api'
import { useGraphicMediaPreferences } from '@/config/useLocalPreferences'
import { CollectionId } from '@/reports/helpers/subject'
import { classNames, pluralize } from '@/lib/util'
import { DataField } from '../DataField'
import { displayError } from '../Loader'
import { ImageList } from '../posts/ImageList'
import { AtmosphereRecordView } from './atmosphereRecordView'
import { asObject, asText, recordReference, safeHttpUrl } from './helpers'
import { ExternalUrl, SimpleRecordProps } from './SimpleRecord'
import { useAtmosphereRecordView } from './useAtmosphereRecordView'

type ExternalRecordEnhancedViewProps = Pick<
  SimpleRecordProps,
  'uri' | 'cid' | 'value' | 'labels'
> & {
  collection: string
  isSnapshot: boolean
}

type View = NonNullable<AtmosphereRecordView['view']>

// Minimal Appview additions shown above the simple record: resolved public
// URLs and, for galleries, the photos Appview returned. Titles, bodies and
// other record content stay with the simple renderer. The simple record never
// waits on this section.
export function ExternalRecordEnhancedView({
  collection,
  isSnapshot,
  ...record
}: ExternalRecordEnhancedViewProps) {
  const { data, error, isLoading } = useAtmosphereRecordView({
    uri: record.uri,
    cid: record.cid,
  })
  const view = data?.view
  const supported = view && isViewForCollection(view, collection)

  let content: ReactNode
  if (isLoading) {
    content = <Note>Loading Appview context…</Note>
  } else if (!supported) {
    content = (
      <Note>
        {isSnapshot
          ? 'Appview context unavailable for this snapshot'
          : error
            ? `Appview context unavailable: ${displayError(error)}`
            : 'Appview context unavailable'}
      </Note>
    )
  } else if (collection === CollectionId.SiteStandardDocument) {
    content = (
      <SiteStandardDocumentView
        view={view}
        value={record.value}
        isSnapshot={isSnapshot}
      />
    )
  } else if (collection === CollectionId.SiteStandardPublication) {
    content = <SiteStandardPublicationView view={view} />
  } else if (collection === CollectionId.SocialGrainGallery) {
    content = (
      <SocialGrainGalleryView
        view={view}
        labels={record.labels}
        isSnapshot={isSnapshot}
      />
    )
  } else {
    content = <PlaceStreamLivestreamView view={view} />
  }

  return (
    <section
      aria-label="Appview"
      className="mb-2 min-w-0 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm text-gray-700 dark:text-gray-200"
    >
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Appview
      </h3>
      {content}
    </section>
  )
}

function isViewForCollection(view: View, collection: string) {
  switch (collection) {
    case CollectionId.SiteStandardDocument:
      return AppBskyEmbedExternal.isViewArticle(view)
    case CollectionId.SiteStandardPublication:
      return AppBskyEmbedExternal.isViewArticlePublication(view)
    case CollectionId.SocialGrainGallery:
      return AppBskyEmbedExternal.isViewGallery(view)
    case CollectionId.PlaceStreamLivestream:
      return AppBskyEmbedExternal.isViewLivestream(view)
    default:
      return false
  }
}

function Note({ children }: { children: ReactNode }) {
  return <p className="text-xs text-gray-500 dark:text-gray-400">{children}</p>
}

function SiteStandardDocumentView({
  view,
  value,
  isSnapshot,
}: {
  view: View
  value: unknown
  isSnapshot: boolean
}) {
  const { uri, publisher } = view as AppBskyEmbedExternal.ViewArticle
  const publisherName = asText(publisher?.title)
  const hasReferencedPublication = !!recordReference(
    asObject(value).site,
    CollectionId.SiteStandardPublication,
  )
  return (
    <>
      <dl className="space-y-2">
        <DataField label="Article URL">
          <ExternalUrl value={uri} />
        </DataField>
        {publisherName && <DataField label="Publisher" value={publisherName} />}
        {publisher && (
          <DataField label="Publication URL">
            <ExternalUrl value={publisher.uri} />
          </DataField>
        )}
      </dl>
      {isSnapshot && publisher && hasReferencedPublication && (
        <Note>
          Publication details reflect current Appview data, not the snapshot
          date.
        </Note>
      )}
    </>
  )
}

function SiteStandardPublicationView({ view }: { view: View }) {
  const { uri } = view as AppBskyEmbedExternal.ViewArticlePublication
  return (
    <dl>
      <DataField label="Publication URL">
        <ExternalUrl value={uri} />
      </DataField>
    </dl>
  )
}

function PlaceStreamLivestreamView({ view }: { view: View }) {
  const { uri } = view as AppBskyEmbedExternal.ViewLivestream
  return (
    <dl>
      <DataField label="Viewing URL">
        <ExternalUrl value={uri} />
      </DataField>
    </dl>
  )
}

// Appview samples up to 10 photos and does not say whether more exist.
function SocialGrainGalleryView({
  view,
  labels = [],
  isSnapshot,
}: {
  view: View
  labels?: string[]
  isSnapshot: boolean
}) {
  const gallery = view as AppBskyEmbedExternal.ViewGallery
  const { getMediaFiltersForLabels } = useGraphicMediaPreferences()
  const images = (Array.isArray(gallery.items) ? gallery.items : []).flatMap(
    (item) => {
      if (!AppBskyEmbedExternal.isViewGalleryImage(item)) return []
      const thumb = safeHttpUrl(item.thumbnail)
      const fullsize = safeHttpUrl(item.fullsize)
      if (!thumb || !fullsize) return []
      return {
        thumb,
        fullsize,
        alt: asText(item.alt) ?? '',
        aspectRatio: item.aspectRatio,
      }
    },
  )
  // Photo labels are folded into the view's labels and cannot be matched to
  // individual images, so the strictest filters apply to the whole gallery.
  const viewLabels = Array.isArray(gallery.labels) ? gallery.labels : []
  const filters = getMediaFiltersForLabels([
    ...labels,
    ...viewLabels.flatMap((label) =>
      label && !label.neg && typeof label.val === 'string' ? label.val : [],
    ),
  ])
  return (
    <>
      <dl className="mb-2">
        <DataField label="Gallery URL">
          <ExternalUrl value={gallery.uri} />
        </DataField>
      </dl>
      <Note>
        {`Showing ${pluralize(images.length, 'photo')} returned by Appview; ` +
          'up to 10.'}
      </Note>
      {isSnapshot && (
        <Note>
          Photos reflect current Appview data and may differ from those present
          when this snapshot was saved.
        </Note>
      )}
      {images.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <ImageList
            images={images}
            imageClassName={classNames(
              'h-32 w-full rounded object-cover',
              filters.blur ? 'blur-sm hover:blur-none' : '',
              filters.grayscale ? 'grayscale' : '',
              filters.translucent ? 'opacity-40' : '',
            )}
          />
        </div>
      )}
    </>
  )
}
