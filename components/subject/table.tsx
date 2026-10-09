import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  CheckCircleIcon,
  ChevronDownIcon,
  Bars3BottomLeftIcon,
} from '@heroicons/react/20/solid'
import { SubjectStatus } from '@/lib/types'
import { LoadMoreButton } from '../common/LoadMoreButton'
import { classNames, pluralize } from '@/lib/util'
import { SubjectOverview } from '../reports/SubjectOverview'
import { Loading } from '../common/Loader'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { Fragment, HTMLAttributes } from 'react'
import { ReviewStateIcon } from './ReviewStateMarker'
import {
  Popover,
  Transition,
  PopoverButton,
  PopoverPanel,
} from '@headlessui/react'
import { ButtonGroup } from '@/common/buttons'
import { asPredicate, ToolsOzoneModerationDefs } from '@atproto/api'
import { StatView } from './Summary'
import {
  FlagIcon,
  ShieldExclamationIcon,
  TrashIcon,
} from '@heroicons/react/24/solid'
import { PriorityScore } from './PriorityScore'
import { AccountStrike } from './AccountStrike'
import { getSubjectStatusSortParams } from '@/lib/subject-status-sort'

const useSortOrder = () => {
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const { sortField } = getSubjectStatusSortParams(searchParams)

  function getSortLink(field: string) {
    const params = new URLSearchParams(searchParams)
    params.set('sortDirection', 'desc')
    params.set('sortField', field)
    return `${pathname}?${params}`
  }

  return { sortField, getSortLink }
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
          <thead className="bg-white dark:bg-slate-800">
            <SubjectRowHead />
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:bg-slate-800">
            {!subjectStatuses.length && (
              <EmptyRows
                isInitialLoading={isInitialLoading}
                mayHaveMoreItems={showLoadMore}
              />
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

export const SubjectSummaryColumn = ({
  accountStrike,
  recordStats,
  accountStats,
  priorityScore,
}: {
  priorityScore?: number
  accountStrike?: ToolsOzoneModerationDefs.AccountStrike
  recordStats?: ToolsOzoneModerationDefs.RecordsStats
  accountStats?: ToolsOzoneModerationDefs.AccountStats
}) => {
  const { takendownCount, reportedCount, totalReports } = recordStats || {}
  const { suspendCount } = accountStats || {}

  return (
    <div className="flex flex-row gap-1 items-center">
      <AccountStrike size="sm" accountStrike={accountStrike} />
      <PriorityScore size="sm" priorityScore={priorityScore || 0} />
      {!!suspendCount && (
        <StatView
          appearance="danger"
          count={suspendCount}
          Icon={ShieldExclamationIcon}
          title={`account suspended ${pluralize(suspendCount, 'time')}`}
        />
      )}
      {!!reportedCount && (
        <StatView
          appearance="info"
          count={reportedCount}
          Icon={FlagIcon}
          title={`${pluralize(
            reportedCount,
            'record',
          )} authored by this user reported ${pluralize(
            totalReports || 0,
            'time',
          )}`}
        />
      )}
      {!!takendownCount && (
        <StatView
          appearance="danger"
          count={takendownCount}
          Icon={ShieldExclamationIcon}
          title={`${pluralize(
            takendownCount,
            'record',
          )} authored by this account has been taken down`}
        />
      )}
    </div>
  )
}

const HostingStateIcon = ({
  hosting,
}: {
  hosting?: ToolsOzoneModerationDefs.SubjectStatusView['hosting']
}) => {
  if (!hosting) {
    return null
  }
  if (
    asPredicate(ToolsOzoneModerationDefs.validateRecordHosting)(hosting) ||
    asPredicate(ToolsOzoneModerationDefs.validateAccountHosting)(hosting)
  ) {
    if (hosting.status === 'deleted') {
      return (
        <TrashIcon className="text-red-500 inline-block w-6 h-6 align-text-bottom" />
      )
    }
  }
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
      <td className="w-full max-w-0 py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-gray-200 sm:w-auto sm:max-w-none sm:pl-6 sm:hidden">
        <div className="flex flex-row items-center pb-1">
          <ReviewStateIcon
            subjectStatus={subjectStatus}
            className="h-4 w-4 mr-1"
          />{' '}
          <SubjectOverview
            subject={subjectStatus.subject}
            subjectRepoHandle={subjectStatus.subjectRepoHandle}
            withTruncation={false}
          />
        </div>
        <dl className="font-normal">
          {lastReviewedAt && (
            <div className="flex items-center flex-row">
              <dt>Last Reviewed</dt>
              <dd className="ml-1 truncate text-gray-700 dark:text-gray-100">
                {formatDistanceToNow(lastReviewedAt, { addSuffix: true })}
              </dd>
            </div>
          )}
          {lastReportedAt && (
            <div className="flex items-center flex-row">
              <dt>Last Reported</dt>
              <dd className="ml-1 truncate text-gray-700 dark:text-gray-100">
                {formatDistanceToNow(lastReportedAt, { addSuffix: true })}
              </dd>
            </div>
          )}
          {!!subjectStatus?.comment && (
            <div className="flex items-center flex-row">
              <dt>Comment</dt>
              <dd className="ml-1 truncate text-gray-700 dark:text-gray-100">
                {subjectStatus.comment}
              </dd>
            </div>
          )}
        </dl>
      </td>
      <td className="hidden text-center px-3 py-4 text-sm text-gray-500 dark:text-gray-100 sm:table-cell">
        <ReviewStateIcon subjectStatus={subjectStatus} className="h-5 w-5" />
        <HostingStateIcon hosting={subjectStatus.hosting} />
      </td>
      <td className="hidden px-3 py-4 text-sm text-gray-500 dark:text-gray-100 sm:table-cell">
        <SubjectOverview
          subject={subjectStatus.subject}
          subjectRepoHandle={subjectStatus.subjectRepoHandle}
        />
      </td>
      <td className="hidden px-3 py-4 text-sm text-gray-500 dark:text-gray-100 sm:table-cell">
        <SubjectSummaryColumn
          accountStrike={subjectStatus.accountStrike}
          priorityScore={subjectStatus.priorityScore}
          recordStats={subjectStatus.recordsStats}
          accountStats={subjectStatus.accountStats}
        />
      </td>
      <td className="hidden px-3 py-4 text-sm text-gray-500 dark:text-gray-100 sm:table-cell max-w-sm">
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
      <td className="hidden px-3 py-4 text-sm text-gray-500 dark:text-gray-100 sm:table-cell">
        {lastReportedAt && (
          <span title={lastReportedAt.toLocaleString()}>
            {formatDistanceToNow(lastReportedAt, { addSuffix: true })}
          </span>
        )}
      </td>
    </tr>
  )
}

const SortButtonGroup = ({
  currentSortField,
  sortField,
  title,
}: {
  currentSortField: string | null
  sortField: string
  title: string
}) => {
  const router = useRouter()
  const { getSortLink } = useSortOrder()

  return (
    <div className="pb-2">
      <p>{title}</p>
      <ButtonGroup
        size="xs"
        leftAligned
        appearance="primary"
        items={[
          {
            id: 'desc',
            text: 'Descending',
            onClick: () => {
              router.push(getSortLink(sortField))
            },
            isActive: currentSortField === sortField,
          },
        ]}
      />
    </div>
  )
}

const SummaryColumnHeader = () => {
  const { sortField } = useSortOrder()
  const hasSort =
    sortField &&
    ['reportedRecordsCount', 'takendownRecordsCount', 'priorityScore'].includes(
      sortField,
    )

  return (
    <Popover className="relative">
      <PopoverButton
        className=" flex flex-row items-center gap-1"
        type="button"
      >
        Summary
        {hasSort ? (
          <ChevronDownIcon className="h-4 w-4" />
        ) : (
          <Bars3BottomLeftIcon className="h-4 w-4" />
        )}
      </PopoverButton>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <PopoverPanel className="absolute z-10 rounded p-4">
          <div className="flex-auto w-auto rounded bg-white dark:bg-slate-800 p-4 text-sm leading-6 shadow-lg dark:shadow-slate-900 ring-1 ring-gray-900/5">
            <SortButtonGroup
              title="Reported records count"
              sortField="reportedRecordsCount"
              currentSortField={sortField}
            />
            <SortButtonGroup
              title="Takendown records count"
              sortField="takendownRecordsCount"
              currentSortField={sortField}
            />
            <SortButtonGroup
              currentSortField={sortField}
              sortField="priorityScore"
              title="Priority score"
            />
          </div>
        </PopoverPanel>
      </Transition>
    </Popover>
  )
}

function SubjectRowHead() {
  const { sortField, getSortLink } = useSortOrder()

  return (
    <tr>
      <th
        scope="col"
        className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200 sm:pl-6 sm:hidden"
      >
        <span className="sr-only">Id</span>
      </th>
      <th
        scope="col"
        className="hidden px-3 py-3.5 text-center text-sm font-semibold text-gray-900 dark:text-gray-200 sm:table-cell"
      >
        Status
      </th>
      <th
        scope="col"
        className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200 sm:table-cell"
      >
        Subject
      </th>
      <th
        scope="col"
        className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200 sm:table-cell"
      >
        <SummaryColumnHeader />
      </th>
      <th
        scope="col"
        className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200 sm:table-cell"
      >
        <Link prefetch={false} href={getSortLink('lastReviewedAt')}>
          Last Reviewed/Note
          {sortField === 'lastReviewedAt' && (
            <ChevronDownIcon className="h-4 w-4 inline-block align-text-bottom" />
          )}
        </Link>
      </th>
      <th
        scope="col"
        className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200 sm:table-cell"
      >
        <Link prefetch={false} href={getSortLink('lastReportedAt')}>
          Last Reported
          {sortField === 'lastReportedAt' && (
            <ChevronDownIcon className="h-4 w-4 inline-block align-text-bottom" />
          )}
        </Link>
      </th>
    </tr>
  )
}

function EmptyRows({
  isInitialLoading,
  mayHaveMoreItems,
}: {
  isInitialLoading: boolean
  mayHaveMoreItems: boolean
}) {
  return (
    <tr>
      <td colSpan={6} className="text-center">
        {isInitialLoading ? (
          <>
            <Loading />
            <p className="pb-4 text-gray-400 dark:text-gray-100">
              Loading moderation queue...
            </p>
          </>
        ) : (
          <p className="py-4 text-gray-400 dark:text-gray-100 text-center">
            <CheckCircleIcon
              title="No reports"
              className="h-10 w-10 text-green-300 align-text-bottom mx-auto mb-4"
            />
            {mayHaveMoreItems ? (
              <>
                <span>No subjects to show</span>
                <br />
                <span className="text-sm">
                  Please click {'"Load More"'} button to check for more items
                </span>
              </>
            ) : (
              'Moderation queue is empty'
            )}
          </p>
        )}
      </td>
    </tr>
  )
}
