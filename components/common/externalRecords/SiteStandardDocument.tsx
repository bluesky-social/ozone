'use client'
import Link from 'next/link'
import { DocumentTextIcon } from '@heroicons/react/24/outline'
import {
  Detail,
  ExternalUrl,
  PostReferenceDetail,
  RecordDate,
  RecordDates,
  RecordDescription,
  RecordImage,
  SimpleRecord,
  SimpleRecordProps,
  TagList,
} from './SimpleRecord'
import {
  asObject,
  asText,
  documentUrl,
  recordReference,
  textList,
} from './helpers'

// Publications are not resolved in the simple view: an AT-URI site stays an
// unresolved reference, while an HTTP(S) site can still produce a source URL.
export function SiteStandardDocument(props: SimpleRecordProps) {
  const record = asObject(props.value)
  const text = asText(record.textContent)
  const site = asText(record.site)
  const publicationRef = recordReference(site, 'site.standard.publication')
  const source = documentUrl(site, record.path)

  return (
    <SimpleRecord
      {...props}
      type="Standard document"
      icon={<DocumentTextIcon />}
      title={asText(record.title) || 'Untitled document'}
      details={
        <>
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
            <Detail label="Path">
              {asText(record.path) ?? 'Invalid path'}
            </Detail>
          )}
          {source && (
            <Detail label="Source URL">
              <ExternalUrl value={source} />
            </Detail>
          )}
          <PostReferenceDetail
            label="Bluesky post"
            uri={asObject(record.bskyPostRef).uri}
          />
        </>
      }
    >
      <RecordDates>
        <RecordDate label="Published" value={record.publishedAt} />
        {record.updatedAt !== undefined && (
          <RecordDate label="Updated" value={record.updatedAt} />
        )}
      </RecordDates>
      <RecordImage
        record={props}
        blob={record.coverImage}
        alt="Document cover image"
      />
      <RecordDescription value={record.description} />
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
      <TagList tags={textList(record.tags)} />
    </SimpleRecord>
  )
}
