import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Bars3BottomLeftIcon,
} from '@heroicons/react/20/solid'
import { LoadMoreButton } from '../common/LoadMoreButton'
import { classNames, pluralize } from '@/lib/util'
import { SubjectOverview } from '../reports/SubjectOverview'
import { Loading } from '../common/Loader'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { Fragment, HTMLAttributes, useState } from 'react'
import { ReviewStateIcon } from '../subject/ReviewStateMarker'
import {
  Popover,
  Transition,
  PopoverButton,
  PopoverPanel,
} from '@headlessui/react'
import { ButtonGroup } from '@/common/buttons'
import {
  asPredicate,
  ToolsOzoneModerationDefs,
  ToolsOzoneReportDefs,
} from '@atproto/api'
import { StatView } from '../subject/Summary'
import {
  FlagIcon,
  ShieldExclamationIcon,
  TrashIcon,
  UserIcon,
} from '@heroicons/react/24/solid'
import { PriorityScore } from '../subject/PriorityScore'
import { AccountStrike } from '../subject/AccountStrike'
import { ReasonBadge } from '../reports/ReasonBadge'
import { ReportStatusBadge } from '../reports/ReportStatusBadge'
import { MutedBadge } from './MutedBadge'
import { TextWithLinks } from '../common/TextWithLinks'
import { LabelList, ModerationLabel } from '../common/labels/List'
import { SubjectTag } from '../tags/SubjectTag'

const useSortOrder = () => {
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const directionKey = 'sortDirection'
  const fieldKey = 'sortField'
  const sortDirection = searchParams.get(directionKey)
  const sortField = searchParams.get(fieldKey)

  function getToggleReverseOrderLink(field: string, newDirection?: string) {
    const params = new URLSearchParams(searchParams)
    // If the caller wants a specific direction, use that
    params.set(
      directionKey,
      newDirection || (sortDirection === 'asc' ? 'desc' : 'asc'),
    )
    params.set(fieldKey, field)
    return `${pathname}?${params}`
  }

  return { sortDirection, sortField, getToggleReverseOrderLink }
}

export function ReportTable(
  props: {
    reports: ToolsOzoneReportDefs.ReportView[]
    showLoadMore: boolean
    isInitialLoading: boolean
    onLoadMore: () => void
  } & HTMLAttributes<HTMLDivElement>,
) {
  const {
    reports,
    showLoadMore,
    onLoadMore,
    isInitialLoading,
    className,
    ...rest
  } = props
  return (
    <div className={classNames('px-4 sm:px-6 lg:px-8', className)} {...rest}>
      <div className="-mx-4 overflow-hidden border border-gray-200 dark:border-gray-700 sm:-mx-6 md:mx-0 md:rounded-md">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-white dark:bg-slate-800">
            <ReportRowHead />
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-slate-800">
            {!reports.length && (
              <EmptyRows
                isInitialLoading={isInitialLoading}
                mayHaveMoreItems={showLoadMore}
              />
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

const COMMENT_TRUNCATE_AT = 120

export const ReporterComment = ({ comment }: { comment: string }) => {
  const [expanded, setExpanded] = useState(false)
  const isLong = comment.length > COMMENT_TRUNCATE_AT

  if (!isLong || expanded) {
    return (
      <div>
        <TextWithLinks text={comment} className="text-sm break-words" />
        {isLong && (
          <button
            onClick={() => setExpanded(false)}
            className="text-xs text-blue-500 hover:underline mt-0.5"
          >
            Show less
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm break-words">
        {comment.slice(0, COMMENT_TRUNCATE_AT).trimEnd()}…{' '}
        <button
          onClick={() => setExpanded(true)}
          className="text-xs text-blue-500 hover:underline"
        >
          Show full
        </button>
      </p>
    </div>
  )
}

// SubjectView.subject is a plain DID or AT-URI string.
// SubjectOverview expects { did } or { uri }, so we convert here.
const subjectStringToObject = (
  subject: string,
): { did: string } | { uri: string } | undefined => {
  if (subject.startsWith('did:')) return { did: subject }
  if (subject.startsWith('at://')) return { uri: subject }
  return undefined
}

import { getHandleFromSubjectView } from 'components/reports/utils'

function ReportRow({
  report,
  ...others
}: {
  report: ToolsOzoneReportDefs.ReportView
} & HTMLAttributes<HTMLTableRowElement>) {
  const router = useRouter()
  const subjectStatus = report.subject.status
  const createdAt = new Date(report.createdAt)
  const updatedAt = report.updatedAt ? new Date(report.updatedAt) : null
  const subjectObj = subjectStringToObject(report.subject.subject)
  const subjectHandle = getHandleFromSubjectView(report.subject)
  const reporterObj = subjectStringToObject(report.reporter.subject)
  const reporterHandle = getHandleFromSubjectView(report.reporter)
  const reporterStatus = report.reporter.status
  const reportUrl = `/reports/${report.id}`

  // Labels and tags for the Subject column
  const isAccountSubject = report.subject.subject.startsWith('did:')
  const subjectLabels = isAccountSubject
    ? report.subject.repo?.labels
    : report.subject.record?.labels
  const subjectTags = subjectStatus?.tags
  // For records: account-level tags from the record's repo moderation status
  const accountTagsForRecord = !isAccountSubject
    ? report.subject.record?.repo?.moderation?.subjectStatus?.tags
    : undefined
  // DID used as recordAuthorDid for ModerationLabel
  const subjectAuthorDid = isAccountSubject
    ? report.subject.subject
    : report.subject.record?.repo?.did

  return (
    <tr {...others}>
      {/* Mobile-only collapsed row */}
      <td className="w-full max-w-0 py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-gray-200 sm:w-auto sm:max-w-none sm:pl-6 sm:hidden">
        <div className="flex flex-row items-center pb-1 gap-1">
          {subjectStatus && (
            <>
              <ReviewStateIcon subjectStatus={subjectStatus} className="h-4 w-4" />
              <HostingStateIcon hosting={subjectStatus.hosting} />
            </>
          )}
          {subjectObj && (
            <SubjectOverview
              subject={subjectObj}
              subjectRepoHandle={subjectHandle}
              withTruncation={false}
            />
          )}
        </div>
        <dl className="font-normal">
          <div className="flex items-center flex-row">
            <dt>Status:</dt>
            <dd className="ml-1 truncate text-gray-700 dark:text-gray-100">
              {report.status}
            </dd>
          </div>
          {report.isMuted && (
            <div className="flex items-center flex-row">
              <dt>Muted:</dt>
              <dd className="ml-1 truncate text-gray-700 dark:text-gray-100">
                Yes
              </dd>
            </div>
          )}
          <div className="flex items-center flex-row gap-1">
            <dt>Reporter:</dt>
            <dd className="ml-1 truncate text-gray-700 dark:text-gray-100">
              {reporterObj && (
                <SubjectOverview
                  subject={reporterObj}
                  subjectRepoHandle={reporterHandle}
                  withTruncation={false}
                />
              )}
            </dd>
          </div>
          <div className="flex items-center flex-row">
            <dt>Reported:</dt>
            <dd className="ml-1 truncate text-gray-700 dark:text-gray-100">
              <Link href={reportUrl} className="hover:underline">
                {formatDistanceToNow(createdAt, { addSuffix: true })}
              </Link>
            </dd>
          </div>
          {!!report.comment && (
            <div className="flex flex-col">
              <dt>Comment:</dt>
              <dd className="mt-0.5 text-gray-700 dark:text-gray-100">
                <ReporterComment comment={report.comment} />
              </dd>
            </div>
          )}
          {updatedAt && (
            <div className="flex items-center flex-row">
              <dt>Last Updated:</dt>
              <dd className="ml-1 truncate text-gray-700 dark:text-gray-100">
                <Link href={reportUrl} className="hover:underline">
                  {formatDistanceToNow(updatedAt, { addSuffix: true })}
                </Link>
              </dd>
            </div>
          )}
          {!!report.assignment && (
            <div className="flex items-center flex-row">
              <dt>Assigned:</dt>
              <dd className="ml-1 truncate text-gray-700 dark:text-gray-100">
                {report.assignment.moderator?.profile?.handle ??
                  report.assignment.moderator?.profile?.displayName ??
                  report.assignment.did}{' '}
                {formatDistanceToNow(
                  new Date(report.assignment.assignedAt),
                  { addSuffix: true },
                )}
              </dd>
            </div>
          )}
          {!!report.actionNote && (
            <div className="flex items-center flex-row">
              <dt>Action Note:</dt>
              <dd className="ml-1 truncate text-gray-700 dark:text-gray-100">
                {report.actionNote}
              </dd>
            </div>
          )}
        </dl>
      </td>
      {/* Report column (first): reason type + comment + timestamp + reporter */}
      <td className="hidden px-3 py-4 text-sm text-gray-500 dark:text-gray-100 sm:table-cell max-w-xs">
        <div className="mb-1 flex flex-row items-center gap-1">
          {report.reportType && (
            <Link href={reportUrl}>
              <ReasonBadge reasonType={report.reportType} />
            </Link>
          )}
          <ReportStatusBadge status={report.status} />
          <MutedBadge isMuted={report.isMuted} />
        </div>
        {!!report.comment && (
          <div
            className="mb-1 cursor-pointer"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('button, a')) return
              router.push(reportUrl)
            }}
          >
            <ReporterComment comment={report.comment} />
          </div>
        )}
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
          <Link href={reportUrl} className="hover:underline" title={createdAt.toLocaleString()}>
            {formatDistanceToNow(createdAt, { addSuffix: true })}
          </Link>
        </div>
        <div className="flex flex-row items-center gap-1">
          {reporterStatus && (
            <>
              <ReviewStateIcon subjectStatus={reporterStatus} className="h-4 w-4 shrink-0" />
              <HostingStateIcon hosting={reporterStatus.hosting} />
            </>
          )}
          {reporterObj && (
            <SubjectOverview subject={reporterObj} subjectRepoHandle={reporterHandle} />
          )}
        </div>
      </td>
      {/* Subject column: status + handle + labels + tags */}
      <td className="hidden px-3 py-4 text-sm text-gray-500 dark:text-gray-100 sm:table-cell">
        <div className="flex flex-row items-center gap-1">
          {subjectStatus && (
            <>
              <ReviewStateIcon subjectStatus={subjectStatus} className="h-4 w-4 shrink-0" />
              <HostingStateIcon hosting={subjectStatus.hosting} />
            </>
          )}
          {subjectObj && (
            <SubjectOverview subject={subjectObj} subjectRepoHandle={subjectHandle} />
          )}
        </div>
        {!!subjectLabels?.length && (
          <LabelList className="flex-wrap gap-0.5 mt-1">
            {subjectLabels.map((label) => (
              <ModerationLabel
                key={`${label.src}-${label.val}`}
                label={label}
                recordAuthorDid={subjectAuthorDid ?? ''}
              />
            ))}
          </LabelList>
        )}
        {!!subjectTags?.length && (
          <LabelList className="flex-wrap gap-0.5 mt-1">
            {subjectTags.sort().map((tag) => (
              <SubjectTag key={tag} tag={tag} />
            ))}
          </LabelList>
        )}
        {!!accountTagsForRecord?.length && (
          <div className="flex flex-row items-center gap-0.5 mt-1">
            <UserIcon className="h-3 w-3 shrink-0 text-gray-400" title="Account" />
            <LabelList className="flex-wrap gap-0.5">
              {accountTagsForRecord.sort().map((tag) => (
                <SubjectTag key={tag} tag={tag} />
              ))}
            </LabelList>
          </div>
        )}
      </td>
      {/* Summary */}
      <td className="hidden px-3 py-4 text-sm text-gray-500 dark:text-gray-100 sm:table-cell">
        {subjectStatus && (
          <SubjectSummaryColumn
            accountStrike={subjectStatus.accountStrike}
            priorityScore={subjectStatus.priorityScore}
            recordStats={subjectStatus.recordsStats}
            accountStats={subjectStatus.accountStats}
          />
        )}
        {report.relatedReportCount !== undefined &&
          report.relatedReportCount > 0 && (
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              +{report.relatedReportCount} related{' '}
              {pluralize(report.relatedReportCount, 'report')}
            </div>
          )}
      </td>
      {/* Last Update column: links to report detail */}
      <td className="hidden px-3 py-4 text-sm text-gray-500 dark:text-gray-100 sm:table-cell">
        <Link
          href={reportUrl}
          className="block hover:underline"
          title={updatedAt?.toLocaleString()}
        >
          {updatedAt
            ? formatDistanceToNow(updatedAt, { addSuffix: true })
            : '—'}
        </Link>
        {!!report.actionNote && (
          <Link
            href={reportUrl}
            className="block text-xs text-gray-600 dark:text-gray-400 mt-1 hover:underline"
          >
            {report.actionNote}
          </Link>
        )}
        {!!report.assignment && (
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span title={`Assigned ${new Date(report.assignment.assignedAt).toLocaleString()}`}>
              Assigned to{' '}
              {report.assignment.moderator?.profile?.handle ??
                report.assignment.moderator?.profile?.displayName ??
                report.assignment.did}{' '}
              {formatDistanceToNow(new Date(report.assignment.assignedAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        )}
      </td>
    </tr>
  )
}

const ToggleSortButtonGroup = ({
  currentSortDirection,
  currentSortField,
  sortField,
  title,
}: {
  currentSortDirection: string | null
  currentSortField: string | null
  sortField: string
  title: string
}) => {
  const router = useRouter()
  const { getToggleReverseOrderLink } = useSortOrder()

  return (
    <div className="pb-2">
      <p>{title}</p>
      <ButtonGroup
        size="xs"
        leftAligned
        appearance="primary"
        items={[
          {
            id: 'asc',
            text: 'Ascending',
            onClick: () => {
              router.push(getToggleReverseOrderLink(sortField, 'asc'))
            },
            isActive:
              currentSortField === sortField && currentSortDirection === 'asc',
          },
          {
            id: 'desc',
            text: 'Descending',
            onClick: () => {
              router.push(getToggleReverseOrderLink(sortField, 'desc'))
            },
            isActive:
              currentSortField === sortField && currentSortDirection === 'desc',
          },
        ]}
      />
    </div>
  )
}

const SummaryColumnHeader = () => {
  const { sortDirection, sortField } = useSortOrder()
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
          sortDirection === 'asc' ? (
            <ChevronUpIcon className="h-4 w-4" />
          ) : (
            <ChevronDownIcon className="h-4 w-4" />
          )
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
            <ToggleSortButtonGroup
              title="Reported records count"
              currentSortDirection={sortDirection}
              sortField="reportedRecordsCount"
              currentSortField={sortField}
            />
            <ToggleSortButtonGroup
              title="Takendown records count"
              currentSortDirection={sortDirection}
              sortField="takendownRecordsCount"
              currentSortField={sortField}
            />
            <ToggleSortButtonGroup
              currentSortDirection={sortDirection}
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

function ReportRowHead() {
  const { sortDirection, sortField, getToggleReverseOrderLink } = useSortOrder()

  return (
    <tr>
      <th
        scope="col"
        className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200 sm:pl-6 sm:hidden"
      >
        <span className="sr-only">Report</span>
      </th>
      <th
        scope="col"
        className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200 sm:table-cell"
      >
        <Link
          prefetch={false}
          href={getToggleReverseOrderLink('lastReportedAt')}
        >
          Report
          {sortField === 'lastReportedAt' &&
            (sortDirection === 'asc' ? (
              <ChevronUpIcon className="h-4 w-4 inline-block align-text-bottom" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 inline-block align-text-bottom" />
            ))}
        </Link>
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
        <Link
          prefetch={false}
          href={getToggleReverseOrderLink('lastReviewedAt')}
        >
          Last Update
          {sortField === 'lastReviewedAt' &&
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

function EmptyRows({
  isInitialLoading,
  mayHaveMoreItems,
}: {
  isInitialLoading: boolean
  mayHaveMoreItems: boolean
}) {
  return (
    <tr>
      <td colSpan={5} className="text-center">
        {isInitialLoading ? (
          <>
            <Loading />
            <p className="pb-4 text-gray-400 dark:text-gray-100">
              Loading reports...
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
                <span>No reports to show</span>
                <br />
                <span className="text-sm">
                  Please click {'\"Load More\"'} button to check for more items
                </span>
              </>
            ) : (
              'No reports found'
            )}
          </p>
        )}
      </td>
    </tr>
  )
}
