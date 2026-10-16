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

  const { reports, fetchNextPage, hasNextPage, refetch, isInitialLoading } =
    useReportsQuery()
  const subjectOptions = unique(reports.map((report) => report.subject.subject))

  useTitle(queue ? `${queue.name} - Reports (Beta)` : 'Queue - Reports (Beta)')

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
