'use client'
import { ReactNode } from 'react'
import Link from 'next/link'
import { isDatetimeString } from '@atproto/syntax'
import { useGraphicMediaPreferences } from '@/config/useLocalPreferences'
import { classNames } from '@/lib/util'
import { useBlobUrl } from '../BlobListLightbox'
import { DataField } from '../DataField'
import { ImageList } from '../posts/ImageList'
import {
  asObject,
  asText,
  imageBlobCid,
  recordReference,
  safeHttpUrl,
} from './helpers'

export type SimpleRecordProps = {
  uri: string
  cid: string
  value: unknown
  authorDid: string
  labels?: string[]
}

// Shared shell for raw-record renderers. It only displays the record it is
// given: no related records are fetched or assembled.
export function SimpleRecord({
  uri,
  cid,
  value,
  type,
  icon,
  title,
  children,
  details,
}: Pick<SimpleRecordProps, 'uri' | 'cid' | 'value'> & {
  type: string
  icon: ReactNode
  title: string
  children?: ReactNode
  details?: ReactNode
}) {
  return (
    <article className="min-w-0 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm text-gray-700 dark:text-gray-200">
      <div className="flex items-start gap-2 mb-3">
        <span className="h-5 w-5 shrink-0 text-gray-400">{icon}</span>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {type} · <span className="font-medium">Simple record</span>
          </p>
          <h3 className="font-semibold text-base whitespace-pre-wrap break-words">
            <bdi>{title}</bdi>
          </h3>
        </div>
      </div>
      {children}
      <dl
        dir="ltr"
        className="space-y-2 whitespace-pre-wrap border-t border-gray-100 dark:border-slate-700 pt-3"
      >
        {details}
        <DataField
          label="Record URI"
          value={uri}
          labelText="record URI "
          showCopyButton
        />
        <DataField label="CID" value={cid} labelText="CID " showCopyButton />
      </dl>
      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-gray-500 dark:text-gray-400">
          Raw record
        </summary>
        <pre
          className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs"
          dir="ltr"
        >
          {JSON.stringify(value, null, 2)}
        </pre>
      </details>
    </article>
  )
}

export function RecordDescription({ value }: { value: unknown }) {
  const text = asText(value)
  return text ? (
    <p className="mb-3 whitespace-pre-wrap break-words font-medium">{text}</p>
  ) : null
}

export function RecordDates({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-gray-500 dark:text-gray-400">
      {children}
    </div>
  )
}

export function RecordDate({
  label,
  value,
}: {
  label: string
  value: unknown
}) {
  const text = asText(value)
  const date = isDatetimeString(text) ? new Date(text) : null
  return (
    <span>
      {label}:{' '}
      {date ? (
        <time dateTime={text} title={text}>
          {date.toLocaleString()}
        </time>
      ) : (
        text || 'Not provided'
      )}
    </span>
  )
}

export function TagList({ tags }: { tags: string[] }) {
  if (!tags.length) return null
  return (
    <ul aria-label="Tags" className="mb-3 flex flex-wrap gap-1">
      {tags.map((tag, i) => (
        <li
          key={i}
          className="max-w-full rounded bg-gray-100 dark:bg-slate-700 px-2 py-0.5 text-xs whitespace-pre-wrap break-words"
        >
          {tag}
        </li>
      ))}
    </ul>
  )
}

// Untrusted URL: clickable only when it is a plain HTTP(S) link, otherwise
// shown as inert text.
export function ExternalUrl({ value }: { value: unknown }) {
  const href = safeHttpUrl(value)
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 dark:text-blue-400 hover:underline"
      >
        {href}
      </a>
    )
  }
  return <>{asText(value) ?? 'Invalid URL'}</>
}

export function PostReferenceDetail({
  label,
  uri,
}: {
  label: string
  uri: unknown
}) {
  const post = recordReference(uri, 'app.bsky.feed.post')
  if (!post) return null
  return (
    <DataField label={label}>
      <Link
        href={`/repositories/${encodeURIComponent(post.host)}/app.bsky.feed.post/${encodeURIComponent(post.rkey)}`}
        className="text-blue-600 dark:text-blue-400 hover:underline"
      >
        View associated post
      </Link>
    </DataField>
  )
}

// Renders an image blob from the record under the same media-label policy for
// every record type, including the record's own self-labels.
export function RecordImage({
  record,
  blob,
  alt,
  missingText,
}: {
  record: SimpleRecordProps
  blob: unknown
  alt: string
  missingText?: string
}) {
  const getBlobUrl = useBlobUrl({ authorDid: record.authorDid })
  const { getMediaFiltersForLabels } = useGraphicMediaPreferences()
  const selfLabels = asObject(asObject(record.value).labels).values
  const filters = getMediaFiltersForLabels([
    ...(record.labels ?? []),
    ...(Array.isArray(selfLabels)
      ? selfLabels.flatMap((label) => asText(asObject(label).val) ?? [])
      : []),
  ])
  const cid = imageBlobCid(blob)
  if (!cid) {
    return missingText ? (
      <p className="mb-3 text-gray-500 dark:text-gray-400">{missingText}</p>
    ) : null
  }
  const url = getBlobUrl({ cid })
  return (
    <div className="mb-3">
      <ImageList
        images={[{ thumb: url, fullsize: url, alt }]}
        imageClassName={classNames(
          'max-h-72 max-w-full rounded object-contain',
          filters.blur ? 'blur-sm hover:blur-none' : '',
          filters.grayscale ? 'grayscale' : '',
          filters.translucent ? 'opacity-40' : '',
        )}
      />
    </div>
  )
}
