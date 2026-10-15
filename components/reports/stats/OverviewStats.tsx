import { formatDuration } from '@/lib/util'
import { ClockIcon } from '@heroicons/react/24/outline'
import { dailyAverage } from './statsWindow'
import type {
  HistoricalReportStats,
  ReportStats,
  StatsCoverage,
} from './reportStats'
import { STATS_COLORS } from './statsColors'

export function OverviewStats({
  stats,
  rows = [],
  coverage = {},
  days = 1,
  periodLabel,
  mode = 'expanded',
  showPending = true,
  lastUpdated = stats.lastUpdated,
  isLoading = false,
  isError = false,
  refetch,
}: {
  stats: ReportStats
  rows?: HistoricalReportStats[]
  coverage?: StatsCoverage
  days?: number
  periodLabel?: string
  mode?: 'expanded' | 'compact'
  showPending?: boolean
  lastUpdated?: string
  isLoading?: boolean
  isError?: boolean
  refetch?: () => unknown
}) {
  const compact = mode === 'compact'
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
        {refetch && (
          <button type="button" onClick={() => refetch()} className="underline">
            Retry
          </button>
        )}
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
    dailyAverage(rows, key, new Date().toISOString().slice(0, 10))
  const hasTargets =
    stats.closureTargetMetCount != null &&
    stats.closureTargetMissedCount != null
  const targetCount = hasTargets
    ? stats.closureTargetMetCount! + stats.closureTargetMissedCount!
    : undefined
  const targetRate = targetCount
    ? Math.round((stats.closureTargetMetCount! / targetCount) * 100)
    : undefined
  const inboundCard = {
    key: 'inboundCount' as const,
    label: 'Inbound',
    value: count(stats.inboundCount),
    description:
      periodLabel === 'Today'
        ? 'New reports received today'
        : 'New reports received in this period',
    average: average('inboundCount'),
  }
  const escalatedCard = {
    key: 'escalatedCount' as const,
    label: 'Escalated',
    value: count(stats.escalatedCount),
    description:
      periodLabel === 'Today'
        ? 'Escalation events today'
        : 'Escalation events in this period',
    average: average('escalatedCount'),
  }
  const expandedCards = [
    inboundCard,
    {
      key: 'pendingCount' as const,
      label: 'Pending',
      value: count(stats.pendingCount),
      description:
        stats.closureTargetOverdueCount != null ? (
          <span className={STATS_COLORS.closureTargetOverdueCount.text}>
            {count(stats.closureTargetOverdueCount)} past closure target
          </span>
        ) : (
          'Unmuted backlog'
        ),
    },
    {
      key: 'closedCount' as const,
      label: 'Closed',
      value: count(stats.closedCount),
      description:
        stats.acknowledgedCount != null &&
        stats.actionedCount != null &&
        stats.acknowledgedCount + stats.actionedCount === stats.closedCount ? (
          <>
            <span className={STATS_COLORS.acknowledgedCount.text}>
              {count(stats.acknowledgedCount)} acknowledged
            </span>{' '}
            ·{' '}
            <span className={STATS_COLORS.actionedCount.text}>
              {count(stats.actionedCount)} actioned
            </span>
          </>
        ) : (
          'Closure breakdown unavailable'
        ),
      average: average('closedCount'),
    },
    escalatedCard,
    {
      key: 'avgHandlingTimeSec' as const,
      label: 'Avg handling time',
      value:
        stats.avgHandlingTimeSec != null
          ? formatDuration(stats.avgHandlingTimeSec)
          : '—',
      description: 'Assignment to closure',
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
    },
  ]

  const cards = compact
    ? [
        inboundCard,
        {
          key: 'pendingCount' as const,
          label: 'Pending',
          value: count(stats.pendingCount),
          description: 'Current unmuted backlog',
        },
        {
          key: 'acknowledgedCount' as const,
          label: 'Acknowledged',
          value: count(stats.acknowledgedCount),
          description: 'Reports closed without an action',
        },
        {
          key: 'actionedCount' as const,
          label: 'Actioned',
          value: count(stats.actionedCount),
          description: 'Reports closed with an action',
        },
        escalatedCard,
        {
          key: 'avgResolutionTimeSec' as const,
          label: 'Avg resolution time',
          value:
            stats.avgResolutionTimeSec != null
              ? formatDuration(stats.avgResolutionTimeSec)
              : '—',
          description: 'Report creation to closure',
        },
      ]
    : expandedCards

  const visibleCards = cards.filter(
    ({ key }) => showPending || key !== 'pendingCount',
  )

  if (compact) {
    const updatedLabel = lastUpdated
      ? `Updated ${new Date(lastUpdated).toLocaleString()}`
      : undefined
    return (
      <section
        aria-label="Overview metrics"
        data-cy="overview-metrics"
        data-mode="compact"
        className="flex flex-wrap items-center gap-2"
      >
        <dl className="flex flex-wrap items-center gap-2">
          {visibleCards.map(({ key, label, value, description }) => (
            <div
              key={key}
              data-metric={key}
              title={typeof description === 'string' ? description : undefined}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATS_COLORS[key].badge} ${STATS_COLORS[key].text}`}
            >
              <dt className="order-last">{label}</dt>
              <dd data-cy="metric-value" className="font-bold tabular-nums">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        {lastUpdated && (
          <time
            dateTime={lastUpdated}
            title={updatedLabel}
            aria-label={updatedLabel}
            tabIndex={0}
            className="text-gray-400 dark:text-gray-500"
          >
            <ClockIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </time>
        )}
      </section>
    )
  }

  return (
    <section
      aria-label="Overview metrics"
      data-cy="overview-metrics"
      data-mode="expanded"
    >
      {periodLabel && periodLabel !== 'Today' && (
        <h2 className="mb-3 font-medium text-gray-900 dark:text-gray-100">
          {periodLabel} (UTC)
        </h2>
      )}
      <dl
        className={`grid grid-cols-2 gap-3 md:grid-cols-3 ${showPending ? 'xl:grid-cols-6' : 'xl:grid-cols-5'}`}
      >
        {visibleCards.map((card) => {
          const { key, label, value, description } = card
          const average = 'average' in card ? card.average : undefined
          return (
            <div
              key={key}
              data-metric={key}
              className="flex min-w-0 flex-col gap-2 rounded-xl border border-gray-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-800"
            >
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: STATS_COLORS[key].color }}
                />
                {label}
              </dt>
              <dd
                data-cy="metric-value"
                className={`break-words text-3xl font-bold tracking-tight tabular-nums ${STATS_COLORS[key].text}`}
              >
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
              {days > 1 &&
                key !== 'pendingCount' &&
                (coverage[key] ?? 0) < days && (
                  <dd className="text-xs text-amber-700 dark:text-amber-300">
                    Available for {coverage[key] ?? 0} of {days} days.
                  </dd>
                )}
            </div>
          )
        })}
      </dl>
    </section>
  )
}
