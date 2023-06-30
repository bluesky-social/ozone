import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/20/solid'
import { Report } from '@/lib/types'
import { LoadMoreButton } from '../common/LoadMoreButton'
import { classNames, truncate } from '@/lib/util'
import { SubjectOverview } from './SubjectOverview'
import { ReasonBadge } from './ReasonBadge'
import { Loading } from '../common/Loader'
import { useSearchParams, usePathname } from 'next/navigation'
import { HTMLAttributes } from 'react'

const useSortOrder = () => {
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const key = 'reverse'
  // Force convert to boolean
  const reverseOrder = !!searchParams.get(key)

  function getToggleReverseOrderLink() {
    const params = new URLSearchParams(searchParams)
    params.set(key, reverseOrder ? '' : 'true')
    return `${pathname}?${params}`
  }

  return { reverseOrder, getToggleReverseOrderLink }
}

export function ReportsTable(
  props: {
    reports: Report[]
    showLoadMore: boolean
    isInitialLoading: boolean
    onLoadMore: () => void
  } & HTMLAttributes<HTMLDivElement>,
) {
  const { reports, showLoadMore, onLoadMore, isInitialLoading, className, ...rest } = props
  return (
    <div className={classNames("px-4 sm:px-6 lg:px-8", className)} {...rest}>
      <div className="-mx-4 overflow-hidden border border-gray-300 sm:-mx-6 md:mx-0 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-white">
            <ReportRowHead />
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {!reports.length && (
              <EmptyRows isInitialLoading={isInitialLoading} />
            )}
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
        <SubjectOverview
          subject={report.subject}
          subjectRepoHandle={report.subjectRepoHandle}
          withTruncation={false}
        />
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
        <SubjectOverview
          subject={report.subject}
          subjectRepoHandle={report.subjectRepoHandle}
        />
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
  const { reverseOrder, getToggleReverseOrderLink } = useSortOrder()

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
        <Link href={getToggleReverseOrderLink()}>
          Created
          {reverseOrder ? (
            <ChevronUpIcon className="h-4 w-4 inline-block align-text-bottom" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 inline-block align-text-bottom" />
          )}
        </Link>
      </th>
      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
        <span className="sr-only">View</span>
      </th>
    </tr>
  )
}

function EmptyRows({ isInitialLoading }: { isInitialLoading: boolean }) {
  return (
    <tr>
      <td colSpan={5} className="text-center">
        {isInitialLoading ? (
          <>
            <Loading />
            <p className="pb-4 text-gray-400">Loading reports...</p>
          </>
        ) : (
          <p className="py-4 text-gray-400 text-center">
            <CheckCircleIcon
              title="No reports"
              className="h-10 w-10 text-green-300 align-text-bottom mx-auto mb-4"
            />
            No reports found
          </p>
        )}
      </td>
    </tr>
  )
}
