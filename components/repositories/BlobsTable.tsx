import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ShieldExclamationIcon } from '@heroicons/react/20/solid'
import { ComAtprotoAdminDefs } from '@atproto/api'
import { ComponentProps } from 'react'
import { formatBytes } from '@/lib/util'

export function BlobsTable(props: { blobs: ComAtprotoAdminDefs.BlobView[] }) {
  const { blobs } = props
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="-mx-4 mt-8 overflow-hidden border border-gray-300 sm:-mx-6 md:mx-0 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-white">
            <BlobRowHead />
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {blobs.map((blob) => (
              <BlobRow key={blob.cid} blob={blob} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BlobRow(props: { blob: ComAtprotoAdminDefs.BlobView }) {
  const { blob, ...others } = props
  const createdAt = new Date(blob.createdAt)
  const { currentAction } = blob.moderation ?? {}
  const actionColorClasses =
    currentAction?.action === ComAtprotoAdminDefs.TAKEDOWN
      ? 'text-rose-600 hover:text-rose-700'
      : 'text-indigo-600 hover:text-indigo-900'
  const displayActionType = currentAction?.action.replace(
    'com.atproto.admin.defs#',
    '',
  )
  return (
    <tr {...others}>
      <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 text-ellipsis overflow-hidden max-w-xs">
        {blob.cid}
      </td>
      <td className="px-3 py-4 text-sm text-gray-500">
        <Chip>{blob.mimeType}</Chip>
        <Chip>{formatBytes(blob.size)}</Chip>
        {(ComAtprotoAdminDefs.isImageDetails(blob.details) ||
          ComAtprotoAdminDefs.isVideoDetails(blob.details)) && (
          <Chip>
            {blob.details.height}x{blob.details.width}px
          </Chip>
        )}
      </td>
      <td className="px-3 py-4 text-sm text-gray-500">
        <span title={createdAt.toLocaleString()}>
          {formatDistanceToNow(createdAt, { addSuffix: true })}
        </span>
      </td>
      <td className="py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
        {currentAction && (
          <Link
            href={`/actions/${currentAction.id}`}
            title={displayActionType}
            className={`${actionColorClasses} whitespace-nowrap`}
          >
            <ShieldExclamationIcon className="h-5 w-5 inline-block align-bottom" />{' '}
            View #{currentAction.id}
          </Link>
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
        className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
      >
        CID
      </th>
      <th
        scope="col"
        className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 lg:table-cell"
      >
        Details
      </th>
      <th
        scope="col"
        className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 lg:table-cell"
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
