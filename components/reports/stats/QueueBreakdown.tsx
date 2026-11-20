import type { ToolsOzoneReportGetStatGroupDetails } from '@atproto/api'
import { useQueueById } from '@/queues/useQueues'
import { ReportTypeBreakdown } from './ReportTypeBreakdown'
import { useStatGroupDetails } from './useStatGroupDetails'

type QueueBreakdownProps = Pick<
  ToolsOzoneReportGetStatGroupDetails.QueryParams,
  'startDate' | 'endDate'
> & { queueId: number }

export function QueueBreakdown({
  queueId,
  startDate,
  endDate,
}: QueueBreakdownProps) {
  const isUnqueued = queueId === -1
  const { queue, isLoading } = useQueueById(isUnqueued ? null : queueId)
  const query = useStatGroupDetails(
    { queueId, startDate, endDate },
    { enabled: isUnqueued || !!queue },
  )

  if (!isUnqueued && !queue) {
    return isLoading ? (
      <p role="status" className="text-sm text-gray-500 dark:text-gray-400">
        Loading queue details...
      </p>
    ) : (
      <p role="alert" className="text-sm text-gray-500 dark:text-gray-400">
        Queue is unavailable.
      </p>
    )
  }

  return (
    <ReportTypeBreakdown
      reportTypes={queue?.reportTypes}
      data={query.isError ? undefined : query.data}
      isLoading={query.isLoading}
      isError={query.isError}
      onRetry={() => query.refetch()}
    />
  )
}
