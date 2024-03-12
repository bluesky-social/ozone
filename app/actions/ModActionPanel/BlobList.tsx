import { ComponentProps } from 'react'
import Link from 'next/link'
import { ComAtprotoAdminDefs } from '@atproto/api'
import { ShieldExclamationIcon } from '@heroicons/react/20/solid'
import { formatBytes } from '@/lib/util'
import { ReviewStateIconLink } from '@/subject/ReviewStateMarker'

export function BlobList(props: {
  name: string
  disabled?: boolean
  blobs: ComAtprotoAdminDefs.BlobView[]
}) {
  const { name, disabled, blobs } = props
  return (
    <fieldset className="space-y-5 min-w-0">
      {!blobs.length && <div className="text-sm text-gray-400">None found</div>}
      {blobs.map((blob) => {
        const { subjectStatus } = blob.moderation ?? {}
        const actionColorClasses = !!subjectStatus?.takendown
          ? 'text-rose-600 hover:text-rose-700'
          : 'text-indigo-600 hover:text-indigo-900'
        // TODO: May be add better display text here? this only goes into title so not that big of a deal
        const displayActionType = subjectStatus?.takendown ? 'Taken down' : ''
        return (
          <div key={blob.cid} className="relative flex items-start">
            <div className="flex h-5 items-center ml-1">
              <input
                id={`blob-${blob.cid}`}
                name={name}
                value={blob.cid}
                aria-describedby={`report-${blob.cid}-description`}
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                disabled={disabled}
              />
            </div>
            <div className="ml-3 text-sm min-w-0 text-ellipsis overflow-hidden whitespace-nowrap">
              <label
                htmlFor={`blob-${blob.cid}`}
                className="font-medium text-gray-700 dark:text-gray-100"
              >
                {subjectStatus && (
                  <>
                    <ReviewStateIconLink subjectStatus={subjectStatus}>
                      <ShieldExclamationIcon className="h-4 w-4 inline-block align-text-bottom" />{' '}
                      #{subjectStatus.id}
                    </ReviewStateIconLink>{' '}
                  </>
                )}
                {blob.cid}
              </label>
              <p id={`blob-${blob.cid}-description`}>
                <Chip>{blob.mimeType}</Chip>
                <Chip>{formatBytes(blob.size)}</Chip>
                {(ComAtprotoAdminDefs.isImageDetails(blob.details) ||
                  ComAtprotoAdminDefs.isVideoDetails(blob.details)) && (
                  <Chip>
                    {blob.details.height}x{blob.details.width}px
                  </Chip>
                )}
              </p>
            </div>
          </div>
        )
      })}
    </fieldset>
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
