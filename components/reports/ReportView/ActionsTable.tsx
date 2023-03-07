import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  ComAtprotoAdminModerationAction,
  ComAtprotoAdminGetModerationAction as ModAction,
} from '@atproto/api'
import { SubjectOverview } from '../SubjectOverview'
import { ArrowUturnDownIcon } from '@heroicons/react/24/outline'
import { truncate } from '../../../lib/util'

export function ActionsTable(props: { actions }) {
  const { actions } = props
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="-mx-4 mt-8 overflow-hidden border border-gray-300 sm:-mx-6 md:mx-0 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-white">
            <ActionRowHead />
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {actions.map((action) => (
              <ActionRow key={action.id} action={action} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ActionRow(props: { action: ModAction.OutputSchema }) {
  const { action, ...others } = props
  const createdAt = new Date(action.createdAt)
  const wasReversed = !!action.reversal

  return (
    <tr {...others}>
      <td className="w-full max-w-0 py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:w-auto sm:max-w-none sm:pl-6">
        <dl className="font-normal">
          <dt className="sr-only">Reason</dt>
          <dd className="mt-1 truncate text-gray-700 w-[250px]">
            <ReasonBadge reasonType={action.action} />{' '}
            {wasReversed ? (
              <>
                <ArrowUturnDownIcon
                  title="Reversed"
                  className="h-4 w-4 inline-block text-red-500 align-text-bottom"
                />{' '}
              </>
            ) : null}
            {truncate(action.reason, 100)}
          </dd>
        </dl>
      </td>
      <td className="hidden px-3 py-4 text-sm text-gray-500 sm:table-cell">
        <SubjectOverview subject={action.subject} />
      </td>
      <td className="hidden px-3 py-4 text-sm text-gray-500 sm:table-cell">
        <span title={createdAt.toLocaleString()}>
          {formatDistanceToNow(createdAt, { addSuffix: true })}
        </span>
      </td>
      <td className="w-full max-w-0 py-4 pl-4 pr-3 text-sm font-medium sm:w-auto sm:max-w-none sm:pl-6">
        <Link
          href={`/actions/${action.id}`}
          className="text-indigo-600 hover:text-indigo-900 whitespace-nowrap"
        >
          View #{action.id}
        </Link>
      </td>
    </tr>
  )
}

function ActionRowHead() {
  const rows = [
    {
      id: 'reason',
      label: 'Reason',
    },
    {
      id: 'subject',
      label: 'Subject',
    },
    {
      id: 'created',
      label: 'Created',
    },
    {
      id: 'view',
      label: 'Link',
    },
  ]

  return (
    <tr>
      {rows.map((row) => (
        <th
          key={row.id}
          scope="col"
          className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 sm:table-cell"
        >
          {row.label}
        </th>
      ))}
    </tr>
  )
}

export function ReasonBadge(props: { reasonType: string }) {
  const { reasonType } = props
  if (!reasonType) {
    return null
  }
  const readable = reasonType?.split('#')?.[1]
  const color = reasonColors[reasonType] ?? reasonColors.default
  return (
    <span
      className={`${color} inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium`}
    >
      {readable}
    </span>
  )
}

const reasonColors: Record<string, string> = {
  [ComAtprotoAdminModerationAction.TAKEDOWN]: 'bg-pink-100 text-pink-800',
  [ComAtprotoAdminModerationAction.FLAG]: 'bg-indigo-100 text-indigo-800',
  [ComAtprotoAdminModerationAction.ACKNOWLEDGE]: 'bg-green-100 text-green-800',
  default: 'bg-gray-100 text-gray-800',
}
