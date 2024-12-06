import { formatDistanceToNow } from 'date-fns'
import { ToolsOzoneModerationDefs } from '@atproto/api'
import { ComponentProps, useState } from 'react'
import { formatBytes } from '@/lib/util'
import { ReviewStateIcon } from '@/subject/ReviewStateMarker'
import { BlobListLightbox } from '@/common/BlobListLightbox'

export function BlobsTable({
  blobs,
  authorDid,
}: {
  authorDid: string
  blobs: ToolsOzoneModerationDefs.BlobView[]
}) {
  const [lightboxImageIndex, setLightboxImageIndex] = useState(-1)
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="-mx-4 mt-8 overflow-hidden border border-gray-300 sm:-mx-6 md:mx-0 md:rounded-lg">
        <BlobListLightbox
          blobs={blobs}
          authorDid={authorDid}
          slideIndex={lightboxImageIndex}
          onClose={() => setLightboxImageIndex(-1)}
        />
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-white dark:bg-slate-800">
            <BlobRowHead />
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:bg-slate-800">
            {blobs.map((blob, i) => (
              <BlobRow
                onView={() => setLightboxImageIndex(i)}
                key={blob.cid}
                blob={blob}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BlobRow(props: {
  onView: () => void
  blob: ToolsOzoneModerationDefs.BlobView
}) {
  const { blob, onView, ...others } = props
  const createdAt = new Date(blob.createdAt)
  const { subjectStatus } = blob.moderation ?? {}

  return (
    <tr {...others}>
      <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-gray-200 text-ellipsis overflow-hidden max-w-xs">
        {blob.cid}
      </td>
      <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-50">
        <Chip>{blob.mimeType}</Chip>
        <Chip>{formatBytes(blob.size)}</Chip>
        {(ToolsOzoneModerationDefs.isImageDetails(blob.details) ||
          ToolsOzoneModerationDefs.isVideoDetails(blob.details)) && (
          <Chip>
            {blob.details.height}x{blob.details.width}px
          </Chip>
        )}
        <button type="button" onClick={onView}>
          <Chip>View</Chip>
        </button>
      </td>
      <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-50">
        <span title={createdAt.toLocaleString()}>
          {formatDistanceToNow(createdAt, { addSuffix: true })}
        </span>
      </td>
      <td className="py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
        {subjectStatus && (
          <ReviewStateIcon
            subjectStatus={subjectStatus}
            className="h-5 w-5 inline-block align-bottom"
          />
        )}
      </td>
    </tr>
  )
}

function BlobRowHead() {
  return (
    <tr>
      <th
        scope="col"
        className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200 sm:pl-6"
      >
        CID
      </th>
      <th
        scope="col"
        className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200 lg:table-cell"
      >
        Details
      </th>
      <th
        scope="col"
        className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200 lg:table-cell"
      >
        Created
      </th>
      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
        <span className="sr-only">Moderation</span>
      </th>
    </tr>
  )
}

function Chip(props: ComponentProps<'span'>) {
  const { className = '', ...others } = props
  return (
    <span
      className={`inline-flex mx-1 items-center rounded-md px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 ${className}`}
      {...others}
    />
  )
}
