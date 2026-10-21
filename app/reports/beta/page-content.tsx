'use client'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { ToolsOzoneModerationEmitEvent } from '@atproto/api'
import { ReportTable } from 'components/reports/table'
import { useTitle } from 'react-use'
import { unique } from '@/lib/util'
import {
  ActionPanelNames,
  hydrateModToolInfo,
  useEmitEvent,
} from '@/mod-event/helpers/emitEvent'
import { ModActionPanelQuick } from 'app/actions/ModActionPanel/QuickAction'
import { WorkspacePanel } from 'components/workspace/Panel'
import { useWorkspaceOpener } from '@/common/useWorkspaceOpener'
import { useQueueById } from '@/queues/useQueues'
import { useReportsQuery } from '@/reports/useReportsQuery'
import { BetaReportsFilters } from '@/reports/Filters'
import { QueueFilterBar } from './QueueFilterBar'
import { isQueueUnavailable } from '@/queues/access'
import { Loading, LoadingFailed } from '@/common/Loader'
import { ActionButton } from '@/common/buttons'
import Link from 'next/link'

export const BetaReportsPageContent = () => {
  const emitEvent = useEmitEvent()
  const params = useSearchParams()
  const quickOpenParam = params.get('quickOpen') ?? ''
  const router = useRouter()
  const pathname = usePathname()

  const { toggleWorkspacePanel, isWorkspaceOpen } = useWorkspaceOpener()

  const rawQueueId = params.get('queueId')
  const parsedQueueId = rawQueueId ? Number(rawQueueId) : null
  const queueId =
    parsedQueueId !== null && !isNaN(parsedQueueId) ? parsedQueueId : null
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

  const {
    reports,
    fetchNextPage,
    hasNextPage,
    refetch,
    isInitialLoading,
    isFetching,
    isFetchedAfterMount,
    error,
  } = useReportsQuery()
  const subjectOptions = unique(reports.map((report) => report.subject.subject))

  useTitle(queue ? `${queue.name} - Reports (Beta)` : 'Queue - Reports (Beta)')

  if (isQueueUnavailable(error)) {
    return (
      <div role="status" className="p-6">
        <h1 className="text-lg font-medium">Queue unavailable</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          This queue does not exist or you no longer have access to it. Ask an
          admin if you need a queue assignment.
        </p>
        <Link href="/queues" className="mt-3 inline-block underline">
          Back to queues
        </Link>
      </div>
    )
  }

  if (rawQueueId && !isFetchedAfterMount && isFetching) return <Loading />
  if (error)
    return (
      <div className="p-6">
        <LoadingFailed error={error} />
        <ActionButton appearance="outlined" onClick={() => refetch()}>
          Retry
        </ActionButton>
      </div>
    )

  return (
    <>
      {queue && <QueueFilterBar queue={queue} onClear={clearQueueFilter} />}
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
