'use client'
import { ReactNode } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { DocumentTextIcon } from '@heroicons/react/24/outline'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useGraphicMediaPreferences } from '@/config/useLocalPreferences'
import { classNames } from '@/lib/util'
import { useBlobUrl } from '../BlobListLightbox'
import { CopyButton } from '../CopyButton'
import { ImageList } from '../posts/ImageList'
import {
  asObject,
  asText,
  coverImageCid,
  documentUrl,
  recordReference,
} from './helpers'

type DocumentProps = {
  uri: string
  cid: string
  value: unknown
}

export function StandardDocumentCard({
  authorDid,
  labels = [],
  ...props
}: DocumentProps & { authorDid: string; labels?: string[] }) {
  const agent = useLabelerAgent()
  const getBlobUrl = useBlobUrl({ authorDid })
  const { getMediaFiltersForLabels } = useGraphicMediaPreferences()
  const record = asObject(props.value)
  const publicationUri = recordReference(
    record.site,
    'site.standard.publication',
  )?.toString()
  const {
    data: publication,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['standardPublication', { uri: publicationUri }],
    enabled: !!publicationUri,
    retry: false,
    queryFn: async () => {
      const { data } = await agent.tools.ozone.moderation.getRecord({
        uri: publicationUri!,
      })
      return asObject(data.value)
    },
  })
  const selfLabels = asObject(record.labels).values
  const allLabels = [
    ...labels,
    ...(Array.isArray(selfLabels)
      ? selfLabels.flatMap((label) => asText(asObject(label).val) ?? [])
      : []),
  ]
  const filters = getMediaFiltersForLabels(allLabels)
  const coverCid = coverImageCid(record.coverImage)

  return (
    <StandardDocumentCardView
      {...props}
      publication={publication}
      publicationStatus={
        publicationUri
          ? isError
            ? 'unavailable'
            : isLoading
              ? 'loading'
              : undefined
          : undefined
      }
      cover={
        coverCid ? (
          <ImageList
            images={[
              {
                thumb: getBlobUrl({ cid: coverCid }),
                fullsize: getBlobUrl({ cid: coverCid }),
                alt: 'Document cover image',
              },
            ]}
            imageClassName={classNames(
              'max-h-72 max-w-full rounded object-contain',
              filters.blur ? 'blur-sm hover:blur-none' : '',
              filters.grayscale ? 'grayscale' : '',
              filters.translucent ? 'opacity-40' : '',
            )}
          />
        ) : undefined
      }
    />
  )
}

export function StandardDocumentCardView({
  uri,
  cid,
  value,
  publication,
  publicationStatus,
  cover,
}: DocumentProps & {
  publication?: Record<string, unknown>
  publicationStatus?: 'loading' | 'unavailable'
  cover?: ReactNode
}) {
  const record = asObject(value)
  const title = asText(record.title)
  const description = asText(record.description)
  const text = asText(record.textContent)
  const site = asText(record.site)
  const publicationRef = recordReference(site, 'site.standard.publication')
  const source = documentUrl(
    publicationRef ? publication?.url : site,
    record.path,
  )
  const post = recordReference(
    asObject(record.bskyPostRef).uri,
    'app.bsky.feed.post',
  )
  const tags = Array.isArray(record.tags)
    ? record.tags.filter((tag): tag is string => typeof tag === 'string')
    : []

  return (
    <article className="min-w-0 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm text-gray-700 dark:text-gray-200">
      <div className="flex items-start gap-2 mb-3">
        <DocumentTextIcon className="h-5 w-5 shrink-0 text-gray-400" />
        <div className="min-w-0">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Standard document
          </p>
          <h3 className="font-semibold text-base whitespace-pre-wrap break-words">
            <bdi>{title || 'Untitled document'}</bdi>
          </h3>
          {asText(publication?.name) && (
            <p className="break-words">{asText(publication?.name)}</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-gray-500 dark:text-gray-400">
        <DocumentDate label="Published" value={record.publishedAt} />
        {record.updatedAt !== undefined && (
          <DocumentDate label="Updated" value={record.updatedAt} />
        )}
      </div>
      {cover && <div className="mb-3">{cover}</div>}
      {description && (
        <p className="mb-3 whitespace-pre-wrap break-words font-medium">
          {description}
        </p>
      )}
      {text ? (
        <div
          className="mb-3 max-h-96 overflow-auto whitespace-pre-wrap break-words"
          aria-label="Document text"
        >
          {text}
        </div>
      ) : (
        <p className="mb-3 text-gray-500 dark:text-gray-400">
          No plain-text content provided.
          {record.content !== undefined &&
            ' Structured content is available in the raw record.'}
        </p>
      )}
      {tags.length > 0 && (
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
      )}
      <dl className="space-y-2 border-t border-gray-100 dark:border-slate-700 pt-3">
        <Detail label="Site">
          {site || 'Not provided'}
          {publicationRef && (
            <Link
              className="ml-2 text-blue-600 dark:text-blue-400 hover:underline"
              href={`/repositories/${encodeURIComponent(publicationRef.host)}/site.standard.publication/${encodeURIComponent(publicationRef.rkey)}`}
            >
              View publication
            </Link>
          )}
        </Detail>
        {record.path !== undefined && (
          <Detail label="Path">{asText(record.path) ?? 'Invalid path'}</Detail>
        )}
        {publicationStatus && (
          <p role="status" className="text-xs text-gray-500 dark:text-gray-400">
            {publicationStatus === 'loading'
              ? 'Loading publication…'
              : 'Publication unavailable. Source URL could not be resolved.'}
          </p>
        )}
        {source && (
          <Detail label="Source URL">
            <a
              href={source}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {source}
            </a>
          </Detail>
        )}
        {post && (
          <Detail label="Bluesky post">
            <Link
              href={`/repositories/${encodeURIComponent(post.host)}/app.bsky.feed.post/${encodeURIComponent(post.rkey)}`}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              View associated post
            </Link>
          </Detail>
        )}
        <Detail label="Record URI">
          {uri}
          <CopyButton
            text={uri}
            labelText="record URI "
            className="ml-2 inline-block"
          />
        </Detail>
        <Detail label="CID">
          {cid}
          <CopyButton
            text={cid}
            labelText="CID "
            className="ml-2 inline-block"
          />
        </Detail>
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

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="break-all whitespace-pre-wrap" dir="ltr">
        {children}
      </dd>
    </div>
  )
}

function DocumentDate({ label, value }: { label: string; value: unknown }) {
  const text = asText(value)
  const date = text ? new Date(text) : null
  return (
    <span>
      {label}:{' '}
      {date && Number.isFinite(date.getTime()) ? (
        <time dateTime={text} title={text}>
          {date.toLocaleString()}
        </time>
      ) : (
        text || 'Not provided'
      )}
    </span>
  )
}
