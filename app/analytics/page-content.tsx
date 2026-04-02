'use client'
import { useQueueList } from '@/queues/useQueues'
import { REPORT_CATEGORIES } from '@/reports/stats'
import { StatValue } from '@/reports/stats/StatValue'
import { StatsCard } from '@/reports/stats/StatsCard'
import { useLiveStats } from '@/reports/stats/useMockReportStats'
import { ToolsOzoneQueueDefs } from '@atproto/api'
import { formatDuration } from 'date-fns'
import { useMemo } from 'react'
import { useTitle } from 'react-use'

function AggregateStatsCard() {
  const { data: stats, isLoading } = useLiveStats()

  return (
    <a
      href="/analytics/stats"
      className="shrink-0 w-64 rounded-lg shadow bg-white dark:bg-slate-800 p-4 dark:shadow-slate-700"
    >
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
        All Queues
      </h3>
      {isLoading ? (
        <div className="text-xs text-gray-400">Loading...</div>
      ) : !stats?.lastUpdated ? (
        <div className="text-xs text-gray-400">No data</div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          <StatValue
            label="Pending"
            value={stats.pendingCount}
            className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
          />
          <StatValue
            label="Escalated"
            value={stats.escalatedPendingCount}
            className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
          />
          <StatValue
            label="Inbound"
            value={stats.inboundCount}
            className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
          />
          <StatValue
            label="Actioned"
            value={stats.actionedCount}
            className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
            suffix={
              stats.actionRate != null ? ` (${stats.actionRate}%)` : undefined
            }
          />
          {stats.avgHandlingTimeSec != null && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              Avg Handling Time:{' '}
              <strong>
                {formatDuration(
                  { seconds: stats.avgHandlingTimeSec },
                  { format: ['hours', 'minutes', 'seconds'] },
                )}
              </strong>
            </span>
          )}
        </div>
      )}
    </a>
  )
}

export function AnalyticsPageContent() {
  useTitle('Analytics')

  const { data: queuePages } = useQueueList()

  const sortedQueues = useMemo(() => {
    const queues = queuePages?.pages.flatMap((p) => p.queues) as
      | ToolsOzoneQueueDefs.QueueView[]
      | undefined
    if (!queues) return []
    return [...queues].sort(
      (a, b) => (b.stats.pendingCount ?? 0) - (a.stats.pendingCount ?? 0),
    )
  }, [queuePages])

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Analytics
      </h1>

      <div className="mb-6">
        <div className="flex gap-4 overflow-x-auto pb-2">
          <StatsCard
            group={{
              key: 'aggregate',
              title: 'Aggregate',
            }}
          />
          {sortedQueues.map((queue, i) => (
            <StatsCard
              key={queue.id}
              group={{
                key: `${i}`,
                title: queue.name,
                queueId: queue.id,
              }}
            />
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          Categories
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {REPORT_CATEGORIES.map((group) => (
            <StatsCard group={group} />
          ))}
        </div>
      </div>
    </div>
  )
}
