import { useLiveStats, LiveStatsParams } from './useReportStats'
import { formatDuration } from '@/lib/util'
import { StatCard, StatValue } from './Stats'

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
      classNamePreset: 'inbound',
    },
    {
      label: 'Pending',
      value: stats.pendingCount,
      classNamePreset: 'pending',
    },
    {
      label: 'Escalated',
      value: stats.escalatedPendingCount,
      classNamePreset: 'escalated',
    },
    {
      label: 'Actioned',
      value: stats.actionedCount,
      suffix: stats.actionRate != null ? ` (${stats.actionRate}%)` : undefined,
      classNamePreset: 'actioned',
    },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatValue
        label="Inbound"
        value={stats.inboundCount}
        classNamePreset="inbound"
      />
      <StatValue
        label="Pending"
        value={stats.pendingCount}
        classNamePreset="pending"
      />
      <StatValue
        label="Escalated"
        value={stats.escalatedPendingCount}
        classNamePreset="escalated"
      />
      <StatValue
        label="Actioned"
        value={stats.actionedCount}
        classNamePreset="actioned"
        suffix={
          stats.actionRate != null ? ` (${stats.actionRate}%)` : undefined
        }
      />
      {stats.avgHandlingTimeSec != null && (
        <StatValue
          label="Avg Handling Time"
          value={formatDuration(stats.avgHandlingTimeSec)}
          classNamePreset="avgHandlingTime"
        />
      )}
      <span className="text-xs text-gray-400 dark:text-gray-500">
        Updated {new Date(stats.lastUpdated).toLocaleTimeString()}
      </span>
    </div>
  )
}

export function LiveStatsCards({ params }: { params?: LiveStatsParams }) {
  const { data: stats, isLoading, isError, refetch } = useLiveStats(params)

  if (isLoading) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Loading stats...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="text-sm text-red-600 dark:text-red-400">
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

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          label="Inbound"
          value={stats.inboundCount}
          classNamePreset="inbound"
        />
        <StatCard
          label="Pending"
          value={stats.pendingCount}
          classNamePreset="pending"
        />
        <StatCard
          label="Escalated"
          value={stats.escalatedPendingCount}
          classNamePreset="escalated"
        />
        <StatCard
          label="Actioned"
          value={stats.actionedCount}
          suffix={stats.actionRate != null ? `${stats.actionRate}%` : undefined}
          classNamePreset="actioned"
        />
        {stats.avgHandlingTimeSec != null && (
          <StatCard
            label="Avg Handling Time"
            value={formatDuration(stats.avgHandlingTimeSec)}
            classNamePreset="avgHandlingTime"
          />
        )}
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
        Updated {new Date(stats.lastUpdated).toLocaleTimeString()}
      </p>
    </div>
  )
}
