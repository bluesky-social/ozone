'use client'
import { useEffect } from 'react'
import {
  ReadonlyURLSearchParams,
  useSearchParams,
  useRouter,
  usePathname,
} from 'next/navigation'
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
import { useQueueById } from '@/queues/useQueues'
import { BetaReportsFilters } from './Filters'
import { QueueFilterBar } from './QueueFilterBar'

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

const REPORTS_LIST_URL_KEY = 'ozone:reportsListUrl'

export const BetaReportsPageContent = () => {
  const emitEvent = useEmitEvent()
  const params = useSearchParams()
  const quickOpenParam = params.get('quickOpen') ?? ''
  const router = useRouter()
  const pathname = usePathname()

  // Store current list URL so the detail page back button can return here
  useEffect(() => {
    const url = pathname + (params.toString() ? `?${params.toString()}` : '')
    sessionStorage.setItem(REPORTS_LIST_URL_KEY, url)
  }, [pathname, params])
  const { toggleWorkspacePanel, isWorkspaceOpen } = useWorkspaceOpener()

  const rawQueueId = params.get('queueId')
  const parsedQueueId = rawQueueId ? Number(rawQueueId) : null
  const queueId = parsedQueueId !== null && !isNaN(parsedQueueId) ? parsedQueueId : null
  const { queue } = useQueueById(queueId)

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
      {queue && (
        <QueueFilterBar queue={queue} onClear={clearQueueFilter} />
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
  const status = params.get('status') ?? 'queued'
  const reportTypes = params.get('reportTypes')
  // queueId is read from the URL to support queue-based filtering later
  const mute = params.get('mute')
  const queueId = params.get('queueId')
  const assignedTo = params.get('assignedTo')
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
        mute,
        assignedTo,
      },
    ],
    queryFn: async ({ pageParam }) => {
      const queryParams: ToolsOzoneReportQueryReports.QueryParams = {
        cursor: pageParam,
        status,
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

      if (assignedTo) {
        queryParams.assignedTo = assignedTo
      }

      // mute=isMuted → only muted; mute=all → both; absent → only unmuted
      if (mute === 'isMuted') {
        queryParams.isMuted = true
      } else if (mute !== 'all') {
        queryParams.isMuted = false
      }

      const { data } = await labelerAgent.tools.ozone.report.queryReports({
        limit: 100,
        ...queryParams,
      })

      return data
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })
}
