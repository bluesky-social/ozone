import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/20/solid'
import { SubjectStatus } from '@/lib/types'
import { LoadMoreButton } from '../common/LoadMoreButton'
import { classNames, truncate } from '@/lib/util'
import { SubjectOverview } from '../reports/SubjectOverview'
import { Loading } from '../common/Loader'
import { useSearchParams, usePathname } from 'next/navigation'
import { HTMLAttributes } from 'react'
import { ReviewStateIcon } from './ReviewStateMarker'

const useSortOrder = () => {
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const directionKey = 'sortDirection'
  const fieldKey = 'sortField'
  const sortDirection = searchParams.get(directionKey)
  const sortField = searchParams.get(fieldKey)

  function getToggleReverseOrderLink(field: string) {
    const params = new URLSearchParams(searchParams)
    params.set(directionKey, sortDirection === 'asc' ? 'desc' : 'asc')
    params.set(fieldKey, field)
    return `${pathname}?${params}`
  }

  return { sortDirection, sortField, getToggleReverseOrderLink }
}

export function SubjectTable(
  props: {
    subjectStatuses: SubjectStatus[]
    showLoadMore: boolean
    isInitialLoading: boolean
    onLoadMore: () => void
  } & HTMLAttributes<HTMLDivElement>,
) {
  const {
    subjectStatuses,
    showLoadMore,
    onLoadMore,
    isInitialLoading,
    className,
    ...rest
  } = props
  return (
    <div className={classNames('px-4 sm:px-6 lg:px-8', className)} {...rest}>
      <div className="-mx-4 overflow-hidden border border-gray-300 sm:-mx-6 md:mx-0 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-white">
            <SubjectRowHead />
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {!subjectStatuses.length && (
              <EmptyRows isInitialLoading={isInitialLoading} />
            )}
            {subjectStatuses.map((subjectStatus) => (
              <SubjectRow
                key={subjectStatus.id}
                subjectStatus={subjectStatus}
              />
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

function SubjectRow({
  subjectStatus,
  ...others
}: { subjectStatus: SubjectStatus } & HTMLAttributes<HTMLTableRowElement>) {
  const lastReviewedAt = subjectStatus.lastReviewedAt
    ? new Date(subjectStatus.lastReviewedAt)
    : null
  const lastReportedAt = subjectStatus.lastReportedAt
    ? new Date(subjectStatus.lastReportedAt)
    : null

  return (
    <tr {...others}>
      <td className="w-full max-w-0 py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:w-auto sm:max-w-none sm:pl-6 sm:hidden">
        <ReviewStateIcon subjectStatus={subjectStatus} className="h-4 w-4" />{' '}
        <SubjectOverview
          subject={subjectStatus.subject}
          subjectRepoHandle={subjectStatus.subjectRepoHandle}
          withTruncation={false}
        />
        <dl className="font-normal">
          <dt className="sr-only">Reason</dt>
          <dd className="mt-1 truncate text-gray-700">
            {/* <ReasonBadge reasonType={report.reasonType} /> {report.reason} */}
          </dd>
        </dl>
      </td>
      <td className="hidden text-center px-3 py-4 text-sm text-gray-500 sm:table-cell">
        <ReviewStateIcon subjectStatus={subjectStatus} className="h-5 w-5" />
      </td>
      <td className="hidden px-3 py-4 text-sm text-gray-500 sm:table-cell">
        <SubjectOverview
          subject={subjectStatus.subject}
          subjectRepoHandle={subjectStatus.subjectRepoHandle}
        />
      </td>
      <td className="hidden px-3 py-4 text-sm text-gray-500 sm:table-cell">
        {lastReviewedAt && (
          <span title={lastReviewedAt.toLocaleString()}>
            {formatDistanceToNow(lastReviewedAt, { addSuffix: true })}
          </span>
        )}
        {!!subjectStatus?.comment && (
          <>
            <br />
            <span>{subjectStatus.comment}</span>
          </>
        )}
      </td>
      <td className="hidden px-3 py-4 text-sm text-gray-500 sm:table-cell">
        {lastReportedAt && (
          <span title={lastReportedAt.toLocaleString()}>
            {formatDistanceToNow(lastReportedAt, { addSuffix: true })}
          </span>
        )}
      </td>
    </tr>
  )
}

function SubjectRowHead() {
  const { sortDirection, sortField, getToggleReverseOrderLink } = useSortOrder()

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
        Subject
      </th>
      <th
        scope="col"
        className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 sm:table-cell"
      >
        <Link href={getToggleReverseOrderLink('lastReviewedAt')}>
          Last Reviewed/Note
          {sortField === 'lastReviewedAt' &&
            (sortDirection === 'asc' ? (
              <ChevronUpIcon className="h-4 w-4 inline-block align-text-bottom" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 inline-block align-text-bottom" />
            ))}
        </Link>
      </th>
      <th
        scope="col"
        className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 sm:table-cell"
      >
        <Link href={getToggleReverseOrderLink('lastReportedAt')}>
          Last Reported
          {sortField === 'lastReportedAt' &&
            (sortDirection === 'asc' ? (
              <ChevronUpIcon className="h-4 w-4 inline-block align-text-bottom" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 inline-block align-text-bottom" />
            ))}
        </Link>
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
            <p className="pb-4 text-gray-400">Loading moderation queue...</p>
          </>
        ) : (
          <p className="py-4 text-gray-400 text-center">
            <CheckCircleIcon
              title="No reports"
              className="h-10 w-10 text-green-300 align-text-bottom mx-auto mb-4"
            />
            Moderation queue is empty
          </p>
        )}
      </td>
    </tr>
  )
}
