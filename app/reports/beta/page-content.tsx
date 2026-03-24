'use client'
import {
  ReadonlyURLSearchParams,
  useSearchParams,
  useRouter,
  usePathname,
} from 'next/navigation'
import { useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import {
  ToolsOzoneModerationEmitEvent,
  ToolsOzoneReportQueryReports,
} from '@atproto/api'
import { ReportTable } from 'components/reports/table'
import { useTitle } from 'react-use'
import { unique } from '@/lib/util'
import {
  ActionPanelNames,
  hydrateModToolInfo,
  useEmitEvent,
} from '@/mod-event/helpers/emitEvent'
import { useFluentReportSearchParams } from '@/reports/useFluentReportSearch'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { ModActionPanelQuick } from 'app/actions/ModActionPanel/QuickAction'
import { WorkspacePanel } from 'components/workspace/Panel'
import { useWorkspaceOpener } from '@/common/useWorkspaceOpener'
import Link from 'next/link'
import { useQueueById } from '@/queues/useQueues'
import { QueueCard } from '@/queues/QueueCard'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid'
import { BetaReportsFilters } from './Filters'

const getSortParams = (params: ReadonlyURLSearchParams) => {
  let sortField = params.get('sortField')
  let sortDirection = params.get('sortDirection')

  if (!['asc', 'desc'].includes(sortDirection ?? '')) {
    sortDirection = 'desc'
  }

  if (!['createdAt', 'updatedAt'].includes(sortField ?? '')) {
    sortField = 'createdAt'
  }

  return { sortField, sortDirection }
}

export const BetaReportsPageContent = () => {
  const emitEvent = useEmitEvent()
  const params = useSearchParams()
  const quickOpenParam = params.get('quickOpen') ?? ''
  const router = useRouter()
  const pathname = usePathname()
  const { toggleWorkspacePanel, isWorkspaceOpen } = useWorkspaceOpener()

  const rawQueueId = params.get('queueId')
  const parsedQueueId = rawQueueId ? Number(rawQueueId) : null
  const queueId = parsedQueueId !== null && !isNaN(parsedQueueId) ? parsedQueueId : null
  const { queue, isLoading: isQueueLoading, notFound: queueNotFound } = useQueueById(queueId)

  const [isQueueExpanded, setIsQueueExpanded] = useState(false)

  const clearQueueFilter = () => {
    const nextParams = new URLSearchParams(params)
    nextParams.delete('queueId')
    router.replace(`${pathname}?${nextParams.toString()}`)
  }

  const setQuickActionPanelSubject = (subject: string) => {
    const searchParams = new URLSearchParams(params)
    if (!subject) {
      searchParams.delete('quickOpen')
    } else {
      searchParams.set('quickOpen', subject)
    }
    router.push((pathname ?? '') + '?' + searchParams.toString())
  }

  const { data, fetchNextPage, hasNextPage, refetch, isInitialLoading } =
    useBetaReportsQuery()

  const reports = data?.pages.flatMap((page) => page.reports) ?? []
  const subjectOptions = unique(reports.map((report) => report.subject.subject))

  useTitle(queue ? `${queue.name} - Reports (Beta)` : 'Queue - Reports (Beta)')

  return (
    <>
      {queueId !== null && (
        <div className="px-4 sm:px-6 lg:px-8 pt-4">
          {isQueueLoading && (
            <div className="text-sm text-gray-500 dark:text-gray-400 py-2">
              Loading queue...
            </div>
          )}
          {queueNotFound && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm text-red-700 dark:text-red-400">
                Queue not found.{' '}
                <Link
                  href="/queues"
                  className="underline hover:text-red-800 dark:hover:text-red-300"
                >
                  Back to queues
                </Link>
              </p>
            </div>
          )}
          {queue && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex items-center gap-3 px-4 py-2.5">
                <button
                  onClick={() => setIsQueueExpanded(!isQueueExpanded)}
                  className="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  title={isQueueExpanded ? 'Collapse queue details' : 'Expand queue details'}
                >
                  {isQueueExpanded ? (
                    <ChevronUpIcon className="h-4 w-4" />
                  ) : (
                    <ChevronDownIcon className="h-4 w-4" />
                  )}
                </button>
                <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                  {queue.name}
                </h3>
                <span
                  className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    queue.enabled
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {queue.enabled ? 'Enabled' : 'Disabled'}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  <strong>{queue.stats.pendingCount}</strong> pending
                </span>
                <div className="ml-auto">
                  <button
                    onClick={clearQueueFilter}
                    className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Clear queue filter"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {isQueueExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700">
                  <QueueCard queue={queue} hiddenFields={['name', 'enabled']} hideViewReports />
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <BetaReportsFilters />
      <ReportTable
        reports={reports}
        showLoadMore={!!hasNextPage}
        onLoadMore={fetchNextPage}
        isInitialLoading={isInitialLoading}
      />
      <ModActionPanelQuick
        open={!!quickOpenParam}
        onClose={() => setQuickActionPanelSubject('')}
        setSubject={setQuickActionPanelSubject}
        subject={quickOpenParam}
        subjectOptions={subjectOptions}
        isInitialLoading={isInitialLoading}
        onSubmit={async (vals: ToolsOzoneModerationEmitEvent.InputSchema) => {
          await emitEvent(
            hydrateModToolInfo(vals, ActionPanelNames.QuickAction),
          )
          refetch()
        }}
      />
      <WorkspacePanel
        open={isWorkspaceOpen}
        onClose={() => toggleWorkspacePanel()}
      />
    </>
  )
}

function useBetaReportsQuery() {
  const labelerAgent = useLabelerAgent()
  const params = useSearchParams()

  const subjectType = params.get('subjectType')
  const collections = params.get('collections')
  const status = params.get('status')
  const reportTypes = params.get('reportTypes')
  // queueId is read from the URL to support queue-based filtering later
  const queueId = params.get('queueId')
  const { sortField, sortDirection } = getSortParams(params)
  const { lastReviewedBy, subject } = useFluentReportSearchParams()

  return useInfiniteQuery({
    queryKey: [
      'betaReports',
      {
        subject,
        sortField,
        sortDirection,
        status,
        reportTypes,
        lastReviewedBy,
        subjectType,
        collections,
        queueId,
      },
    ],
    queryFn: async ({ pageParam }) => {
      const queryParams: ToolsOzoneReportQueryReports.QueryParams = {
        cursor: pageParam,
      }

      if (subject) {
        queryParams.subject = subject
      } else {
        if (subjectType) {
          queryParams.subjectType = subjectType
        }

        if (subjectType === 'record') {
          const collectionNames = collections?.split(',').filter(Boolean)
          if (collectionNames?.length) {
            queryParams.collections = collectionNames
          }
        }
      }

      if (reportTypes) {
        queryParams.reportTypes = reportTypes.split(',').filter(Boolean)
      }

      if (queueId) {
        queryParams.queueId = Number(queueId)
      }

      Object.entries({
        sortField,
        sortDirection,
        status,
        reviewedBy: lastReviewedBy,
      }).forEach(([key, value]) => {
        if (value) {
          queryParams[key] = value
        }
      })

      const { data } = await labelerAgent.tools.ozone.report.queryReports({
        limit: 100,
        ...queryParams,
      })

      return data
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })
}
