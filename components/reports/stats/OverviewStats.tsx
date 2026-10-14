import { formatDuration } from '@/lib/util'
import { useLiveStats } from './useReportStats'

export function OverviewStats() {
  const { data: stats, isLoading, isError, refetch } = useLiveStats()

  if (isLoading) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Loading current stats...
      </p>
    )
  }
  if (isError) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        Failed to load current stats.{' '}
        <button onClick={() => refetch()} className="underline">
          Retry
        </button>
      </p>
    )
  }
  if (!stats?.lastUpdated) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No current data available yet.
      </p>
    )
  }

  const count = (value?: number) => value?.toLocaleString() ?? '—'
  const hasTargets =
    stats.closureTargetMetCount != null &&
    stats.closureTargetMissedCount != null
  const targetCount = hasTargets
    ? stats.closureTargetMetCount! + stats.closureTargetMissedCount!
    : undefined
  const targetRate = targetCount
    ? Math.round((stats.closureTargetMetCount! / targetCount) * 100)
    : undefined
  const cards = [
    {
      label: 'Inbound',
      value: count(stats.inboundCount),
      description: 'New reports received today',
      accent: 'bg-blue-300 dark:bg-blue-400',
    },
    {
      label: 'Pending',
      value: count(stats.pendingCount),
      description:
        stats.closureTargetOverdueCount != null
          ? `${count(stats.closureTargetOverdueCount)} past closure target`
          : 'Current unmuted backlog',
      accent: 'bg-rose-500 dark:bg-rose-400',
    },
    {
      label: 'Closed',
      value: count(stats.closedCount),
      description:
        stats.acknowledgedCount != null && stats.actionedCount != null
          ? `${count(stats.acknowledgedCount)} acknowledged · ${count(stats.actionedCount)} actioned`
          : 'Closure breakdown unavailable',
      accent: 'bg-blue-600 dark:bg-blue-400',
    },
    {
      label: 'Escalated',
      value: count(stats.escalatedCount),
      description: 'Escalation events today',
      accent: 'bg-purple-500 dark:bg-purple-400',
    },
    {
      label: 'Avg handling time',
      value:
        stats.avgHandlingTimeSec != null
          ? formatDuration(stats.avgHandlingTimeSec)
          : '—',
      description: 'Assignment to closure',
      accent: 'bg-slate-500 dark:bg-slate-400',
    },
    {
      label: 'Closure Target',
      value: targetRate != null ? `${targetRate}%` : '—',
      description: targetCount
        ? `${count(stats.closureTargetMetCount)} of ${count(targetCount)} targeted closures met`
        : targetCount === 0
          ? 'No closed reports with a target'
          : 'Target results unavailable',
      accent: 'bg-green-500 dark:bg-green-400',
    },
  ]

  return (
    <section aria-label="Overview metrics" data-cy="overview-metrics">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-medium text-gray-900 dark:text-gray-100">
          Today (UTC)
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Pending is the current unmuted backlog. Updated{' '}
          {new Date(stats.lastUpdated)
            .toISOString()
            .replace('T', ' ')
            .slice(0, 19)}{' '}
          UTC.
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {cards.map(({ label, value, description, accent }) => (
          <div
            key={label}
            className="flex min-w-0 flex-col gap-2 rounded-xl border border-gray-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-800"
          >
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {label}
            </dt>
            <dd className="break-words text-3xl font-bold tracking-tight text-gray-900 tabular-nums dark:text-gray-100">
              {value}
            </dd>
            <dd className="text-xs text-gray-600 dark:text-gray-300">
              {description}
            </dd>
            <div
              aria-hidden="true"
              className={`mt-auto h-1 rounded-full ${accent}`}
            />
          </div>
        ))}
      </dl>
    </section>
  )
}
