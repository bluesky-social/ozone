import { useLiveStats, LiveStatsParams } from './useReportStats'
import { formatDuration } from '@/lib/util'
import { StatValue } from './StatValue'

export function LiveStatsPanel({ params }: { params?: LiveStatsParams }) {
  const { data: stats, isLoading, isError, refetch } = useLiveStats(params)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        Loading stats...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
        Failed to load stats.{' '}
        <button
          onClick={() => refetch()}
          className="underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!stats || !stats.lastUpdated) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        No data available yet
      </div>
    )
  }

  const items = [
    {
      label: 'Inbound',
      value: stats.inboundCount,
      className:
        'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    },
    {
      label: 'Pending',
      value: stats.pendingCount,
      className:
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    },
    {
      label: 'Escalated',
      value: stats.escalatedPendingCount,
      className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    },
    {
      label: 'Actioned',
      value: stats.actionedCount,
      suffix: stats.actionRate != null ? ` (${stats.actionRate}%)` : undefined,
      className:
        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item) => (
        <StatValue key={item.label} {...item} />
      ))}
      {stats.avgHandlingTimeSec != null && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
          Avg Handling Time:{' '}
          <strong>{formatDuration(stats.avgHandlingTimeSec)}</strong>
        </span>
      )}
      <span className="text-xs text-gray-400 dark:text-gray-500">
        Updated {new Date(stats.lastUpdated).toLocaleTimeString()}
      </span>
    </div>
  )
}
