import { formatDuration } from '@/lib/util'
import { dailyAverage, type StatsWindow } from './statsWindow'
import type { WindowStats } from './useStatsWindow'

export function OverviewStats({
  window,
  data,
}: {
  window: StatsWindow
  data: WindowStats
}) {
  const { stats, rows, coverage, lastUpdated, isLoading, isError, refetch } =
    data

  if (isLoading) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Loading stats...
      </p>
    )
  }
  if (isError) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        Failed to load stats.{' '}
        <button onClick={() => refetch()} className="underline">
          Retry
        </button>
      </p>
    )
  }
  if (!lastUpdated && !rows.length) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No stats available yet.
      </p>
    )
  }

  const count = (value?: number) => value?.toLocaleString() ?? '—'
  const average = (key: 'inboundCount' | 'closedCount' | 'escalatedCount') =>
    dailyAverage(rows, key, window.endDate.slice(0, 10))
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
      key: 'inboundCount' as const,
      label: 'Inbound',
      value: count(stats.inboundCount),
      description:
        window.period === 'Today'
          ? 'New reports received today'
          : 'New reports received in this period',
      average: average('inboundCount'),
      accent: 'bg-blue-300 dark:bg-blue-400',
    },
    {
      key: 'pendingCount' as const,
      label: 'Pending',
      value: count(stats.pendingCount),
      description:
        stats.closureTargetOverdueCount != null
          ? `${count(stats.closureTargetOverdueCount)} past closure target`
          : 'Current unmuted backlog',
      accent: 'bg-rose-500 dark:bg-rose-400',
    },
    {
      key: 'closedCount' as const,
      label: 'Closed',
      value: count(stats.closedCount),
      description:
        stats.acknowledgedCount != null &&
        stats.actionedCount != null &&
        stats.acknowledgedCount + stats.actionedCount === stats.closedCount
          ? `${count(stats.acknowledgedCount)} acknowledged · ${count(stats.actionedCount)} actioned`
          : 'Closure breakdown unavailable',
      average: average('closedCount'),
      accent: 'bg-blue-600 dark:bg-blue-400',
    },
    {
      key: 'escalatedCount' as const,
      label: 'Escalated',
      value: count(stats.escalatedCount),
      description:
        window.period === 'Today'
          ? 'Escalation events today'
          : 'Escalation events in this period',
      average: average('escalatedCount'),
      accent: 'bg-purple-500 dark:bg-purple-400',
    },
    {
      key: 'avgHandlingTimeSec' as const,
      label: 'Avg handling time',
      value:
        stats.avgHandlingTimeSec != null
          ? formatDuration(stats.avgHandlingTimeSec)
          : '—',
      description: 'Assignment to closure',
      accent: 'bg-slate-500 dark:bg-slate-400',
    },
    {
      key: 'closureTargetMetRate' as const,
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
          {window.label} (UTC)
        </h2>
      </div>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {cards.map(({ key, label, value, description, accent, average }) => (
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
            {average && (
              <dd className="text-xs text-gray-500 dark:text-gray-400">
                {average.value.toLocaleString(undefined, {
                  maximumFractionDigits: 1,
                })}{' '}
                avg/day · {average.days} complete{' '}
                {average.days === 1 ? 'day' : 'days'}
              </dd>
            )}
            {window.days > 1 &&
              key !== 'pendingCount' &&
              (coverage[key] ?? 0) < window.days && (
                <dd className="text-xs text-amber-700 dark:text-amber-300">
                  Available for {coverage[key] ?? 0} of {window.days} days.
                </dd>
              )}
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
