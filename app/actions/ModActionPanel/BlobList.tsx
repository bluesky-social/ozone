import { ComponentProps, useState } from 'react'
import { ToolsOzoneModerationDefs } from '@atproto/api'
import { ShieldExclamationIcon } from '@heroicons/react/20/solid'
import { formatBytes, pluralize } from '@/lib/util'
import { ReviewStateIconLink } from '@/subject/ReviewStateMarker'
import { FormLabel } from '@/common/forms'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid'
import { BlobListLightbox } from '@/common/BlobListLightbox'
import { PropsOf } from '@/lib/types'

export function BlobList(props: {
  name: string
  disabled?: boolean
  authorDid: string
  blobs: ToolsOzoneModerationDefs.BlobView[]
}) {
  const { name, disabled, blobs } = props
  const [lightboxImageIndex, setLightboxImageIndex] = useState(-1)

  return (
    <fieldset className="space-y-5 min-w-0">
      {!blobs.length ? (
        <div className="text-sm text-gray-400">No blobs found</div>
      ) : (
        <BlobListLightbox
          blobs={blobs}
          authorDid={props.authorDid}
          slideIndex={lightboxImageIndex}
          onClose={() => setLightboxImageIndex(-1)}
        />
      )}
      {blobs.map((blob, i) => {
        const { subjectStatus } = blob.moderation ?? {}
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
            <div className="ml-1 sm:ml-3 text-sm min-w-0 overflow-hidden">
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
                {/* blob cids are long strings of random characters. on mobile screens, it will almost always cause overflow so breaking it into multi lines */}
                <span className="break-all">{blob.cid}</span>
              </label>
              <p id={`blob-${blob.cid}-description`}>
                <Chip>{blob.mimeType}</Chip>
                <Chip>{formatBytes(blob.size)}</Chip>
                {(ToolsOzoneModerationDefs.isImageDetails(blob.details) ||
                  ToolsOzoneModerationDefs.isVideoDetails(blob.details)) && (
                  <Chip>
                    {blob.details.height}x{blob.details.width}px
                  </Chip>
                )}
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    setLightboxImageIndex(i)
                  }}
                >
                  <Chip>View</Chip>
                </button>
              </p>
            </div>
          </div>
        )
      })}
    </fieldset>
  )
}

export const BlobListFormField = ({
  blobs,
  authorDid,
  ...rest
}: {
  authorDid: string
  blobs: ToolsOzoneModerationDefs.BlobView[]
} & Omit<PropsOf<typeof FormLabel>, 'label'>) => {
  const [showBlobList, setShowBlobList] = useState(false)

  return (
    <FormLabel
      {...rest}
      label={
        <button
          type="button"
          className="flex flex-row items-center"
          onClick={() => setShowBlobList(!showBlobList)}
        >
          {pluralize(blobs.length, 'Blob', {
            includeCount: false,
          })}
          {!showBlobList ? (
            <ChevronDownIcon className="w-4 h-4 ml-1 text-white" />
          ) : (
            <ChevronUpIcon className="w-4 h-4 ml-1 text-white" />
          )}
        </button>
      }
    >
      {showBlobList && (
        <BlobList blobs={blobs} authorDid={authorDid} name="subjectBlobCids" />
      )}
    </FormLabel>
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
