import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ComAtprotoReportReasonType } from '@atproto/api'
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/20/solid'
import { Report } from '../../lib/types'
import { LoadMoreButton } from '../common/LoadMoreButton'
import { truncate } from '../../lib/util'
import { SubjectOverview } from './SubjectOverview'

export function ReportsTable(props: {
  reports: Report[]
  showLoadMore: boolean
  onLoadMore: () => void
}) {
  const { reports, showLoadMore, onLoadMore } = props
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="-mx-4 mt-8 overflow-hidden border border-gray-300 sm:-mx-6 md:mx-0 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-white">
            <ReportRowHead />
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {reports.map((report) => (
              <ReportRow key={report.id} report={report} />
            ))}
          </tbody>
        </table>
      </div>
      {showLoadMore && (
        <div className="flex justify-center py-6">
          <LoadMoreButton onClick={onLoadMore} />
        </div>
      )}
    </div>
  )
}

function ReportRow(props: { report: Report }) {
  const { report, ...others } = props
  const resolved = !!report.resolvedByActionIds.length
  const createdAt = new Date(report.createdAt)
  return (
    <tr {...others}>
      <td className="w-full max-w-0 py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:w-auto sm:max-w-none sm:pl-6 sm:hidden">
        {resolved ? (
          <CheckCircleIcon
            title="Resolved"
            className="h-4 w-4 inline-block text-green-500 align-text-bottom"
          />
        ) : (
          <ExclamationCircleIcon
            title="Unresolved"
            className="h-4 w-4 inline-block text-yellow-500 align-text-bottom"
          />
        )}{' '}
        <SubjectOverview subject={report.subject} withTruncation={false} />
        <dl className="font-normal">
          <dt className="sr-only">Reason</dt>
          <dd className="mt-1 truncate text-gray-700">
            <ReasonBadge reasonType={report.reasonType} /> {report.reason}
          </dd>
        </dl>
      </td>
      <td className="hidden text-center px-3 py-4 text-sm text-gray-500 sm:table-cell">
        {resolved ? (
          <CheckCircleIcon
            title="Resolved"
            className="h-5 w-5 inline-block text-green-500"
          />
        ) : (
          <ExclamationCircleIcon
            title="Unresolved"
            className="h-5 w-5 inline-block text-yellow-500"
          />
        )}
      </td>
      <td className="hidden px-3 py-4 text-sm text-gray-500 sm:table-cell">
        <ReasonBadge reasonType={report.reasonType} />{' '}
        {truncate(report.reason ?? '', 100)}
      </td>
      <td className="hidden px-3 py-4 text-sm text-gray-500 sm:table-cell">
        <SubjectOverview subject={report.subject} />
      </td>
      <td className="hidden px-3 py-4 text-sm text-gray-500 sm:table-cell">
        <span title={createdAt.toLocaleString()}>
          {formatDistanceToNow(createdAt, { addSuffix: true })}
        </span>
      </td>
      <td className="py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
        <Link
          href={`/reports/${report.id}`}
          className="text-indigo-600 hover:text-indigo-900 whitespace-nowrap"
        >
          View #{report.id}
        </Link>
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
        Status
      </th>
      <th
        scope="col"
        className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 sm:table-cell"
      >
        Reason
      </th>
      <th
        scope="col"
        className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 sm:table-cell"
      >
        Subject
      </th>
      <th
        scope="col"
        className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 sm:table-cell"
      >
        Created
      </th>
      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
        <span className="sr-only">View</span>
      </th>
    </tr>
  )
}

export function ReasonBadge(props: { reasonType: string }) {
  const { reasonType } = props
  const readable = reasonType.replace('com.atproto.report.reasonType#', '')
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
  [ComAtprotoReportReasonType.SPAM]: 'bg-pink-100 text-pink-800',
  [ComAtprotoReportReasonType.OTHER]: 'bg-indigo-100 text-indigo-800',
  default: 'bg-gray-100 text-gray-800',
}
