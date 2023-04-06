import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/20/solid'
import { InviteCode } from '../../lib/types'
import { truncate } from '../../lib/util'

export function InviteCodesTable(props: { codes: InviteCode[] }) {
  const { codes } = props
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="-mx-4 mt-8 overflow-hidden border border-gray-300 sm:-mx-6 md:mx-0 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-white">
            <ReportRowHead />
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {codes.map((code) => (
              <InviteCodetRow key={code.code} code={code} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function InviteCodetRow(props: { code: InviteCode }) {
  const { code, ...others } = props
  const createdAt = new Date(code.createdAt)
  return (
    <tr {...others}>
      <td className="w-full max-w-0 py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:w-auto sm:max-w-none sm:pl-6 sm:hidden">
        {!code.disabled ? (
          <CheckCircleIcon
            title="Resolved"
            className="h-4 w-4 inline-block text-green-500 align-text-bottom"
          />
        ) : (
          <XCircleIcon
            title="Unresolved"
            className="h-4 w-4 inline-block text-red-500 align-text-bottom"
          />
        )}{' '}
        {code.code}
        <dl className="font-normal">
          <dt className="sr-only">Used by</dt>
          <dd className="mt-1 truncate text-gray-700">
            {code.uses.length > 0
              ? code.uses.map((use) => truncate(use.usedBy, 10)).join(', ')
              : 'Not used yet'}
          </dd>
        </dl>
      </td>
      <td className="hidden text-center px-3 py-4 text-sm text-gray-500 sm:table-cell">
        {!code.disabled ? (
          <CheckCircleIcon
            title="Resolved"
            className="h-5 w-5 inline-block text-green-500"
          />
        ) : (
          <XCircleIcon
            title="Unresolved"
            className="h-5 w-5 inline-block text-red-500"
          />
        )}
      </td>
      <td className="hidden px-3 py-4 text-sm text-gray-500 sm:table-cell">
        {code.code}
      </td>
      <td className="hidden px-3 py-4 text-sm text-gray-500 sm:table-cell">
        {code.available}
      </td>
      <td className="hidden px-3 py-4 text-sm text-gray-500 sm:table-cell">
        {code.uses.length > 0 ? (
          <ul>
            {code.uses.map((use) => (
              <li key={use.usedBy}>
                <Link
                  href={`/repositories/${use.usedBy}`}
                  className="focus:outline-none"
                >
                  {use.usedBy}
                </Link>{' '}
                {formatDistanceToNow(new Date(use.usedAt), { addSuffix: true })}
              </li>
            ))}
          </ul>
        ) : (
          'Not used yet'
        )}
      </td>
      <td className="hidden px-3 py-4 text-sm text-gray-500 sm:table-cell">
        <span title={createdAt.toLocaleString()}>
          {formatDistanceToNow(createdAt, { addSuffix: true })}
        </span>
      </td>
      <td className="hidden px-3 py-4 text-sm text-gray-500 sm:table-cell">
        {code.createdBy}
      </td>
    </tr>
  )
}

function ReportRowHead() {
  return (
    <tr>
      <th
        scope="col"
        className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 sm:hidden"
      >
        <span className="sr-only">Id</span>
      </th>
      <th
        scope="col"
        className="hidden px-3 py-3.5 text-center text-sm font-semibold text-gray-900 sm:table-cell"
      >
        Enabled
      </th>
      <th
        scope="col"
        className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 sm:table-cell"
      >
        Code
      </th>
      <th
        scope="col"
        className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 sm:table-cell"
      >
        Uses
      </th>
      <th
        scope="col"
        className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 sm:table-cell"
      >
        Used by
      </th>
      <th
        scope="col"
        className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 sm:table-cell"
      >
        Created
      </th>
      <th
        scope="col"
        className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 sm:table-cell"
      >
        Created by
      </th>
      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
        <span className="sr-only">View</span>
      </th>
    </tr>
  )
}
