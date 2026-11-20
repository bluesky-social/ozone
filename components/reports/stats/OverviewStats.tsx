import { HelpTooltip } from '@/common/HelpTooltip'
import { formatDuration } from '@/lib/util'
import { ClockIcon } from '@heroicons/react/24/outline'
import type { HistoricalReportStats, ReportStats } from './reportStats'
import { STATS_COLORS } from './statsColors'

export type OverviewStatsMode = 'trends' | 'targets'

const METRIC_HELP = {
  inboundCount:
    'Unmuted reports received during the selected UTC period, including reports that have since been closed.',
  pendingCount:
    'Unmuted reports still awaiting closure at the latest stats update, including reports received before the selected period. This current backlog is independent of the selected date range.',
  closedCount:
    'Reports whose latest closure falls within the selected UTC period, including reports received earlier and muted reports. Acknowledged means closed without a label, tag, or takedown as the closing action; actioned means closed with one. The percentage is actioned reports divided by all closed reports.',
  acknowledgedCount:
    'Reports closed during the selected UTC period without a label, tag, or takedown as the closing action. Includes reports received earlier and muted reports.',
  actionedCount:
    'Reports closed during the selected UTC period with a label, tag, or takedown as the closing action. Includes reports received earlier and muted reports.',
  escalatedCount:
    'Escalation events during the selected UTC period. A report escalated more than once can contribute multiple events.',
  avgHandlingTimeSec:
    'Average elapsed time from assignment to closure for reports closed during the selected UTC period. Includes waiting time after assignment. Reports without an assignment are excluded.',
  avgResolutionTimeSec:
    'Average elapsed time from report creation to closure for reports closed during the selected UTC period. Includes time spent waiting for assignment.',
  closureTargetMetCount:
    'Reports closed during the selected UTC period within their assigned closure target, measured from report creation. Reports without a target are excluded.',
  closureTargetMissedCount:
    'Reports closed during the selected UTC period after their assigned closure target, measured from report creation. Reports without a target are excluded.',
  closureTargetMetRate:
    'Percentage of targeted reports closed during the selected UTC period that met their assigned closure target, measured from report creation. Calculated as target met divided by target met plus target missed. Reports without a target are excluded.',
  closureTargetOverdueCount:
    'Unmuted reports still awaiting closure whose time since creation exceeds their assigned closure target, measured at the latest stats update. Reports without a target are excluded. This current snapshot is independent of the selected date range.',
} as const

function MetricHelp({
  metric,
  label,
}: {
  metric: keyof typeof METRIC_HELP
  label: string
}) {
  return (
    <HelpTooltip
      label={`About ${label.toLowerCase()}`}
      content={METRIC_HELP[metric]}
    />
  )
}

export function OverviewStats({
  stats,
  rows = [],
  periodLabel,
  mode = 'trends',
  layout = 'expanded',
  showPending = true,
  lastUpdated = stats.lastUpdated,
  isLoading = false,
  isError = false,
  refetch,
}: {
  stats: ReportStats
  rows?: HistoricalReportStats[]
  periodLabel?: string
  mode?: OverviewStatsMode
  layout?: 'expanded' | 'compact'
  showPending?: boolean
  lastUpdated?: string
  isLoading?: boolean
  isError?: boolean
  refetch?: () => unknown
}) {
  const compact = layout === 'compact'
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
  const hasTargets =
    stats.closureTargetMetCount != null &&
    stats.closureTargetMissedCount != null
  const targetCount = hasTargets
    ? stats.closureTargetMetCount! + stats.closureTargetMissedCount!
    : undefined
  const targetRate = targetCount
    ? Math.floor((stats.closureTargetMetCount! * 100) / targetCount)
    : undefined
  const inboundCard = {
    key: 'inboundCount' as const,
    label: 'Inbound',
    value: count(stats.inboundCount),
    description:
      periodLabel === 'Today'
        ? 'New reports received today'
        : 'New reports received in this period',
  }
  const escalatedCard = {
    key: 'escalatedCount' as const,
    label: 'Escalated',
    value: count(stats.escalatedCount),
    description:
      periodLabel === 'Today'
        ? 'Escalation events today'
        : 'Escalation events in this period',
  }
  const handlingCard = {
    key: 'avgHandlingTimeSec' as const,
    label: 'Avg handling time',
    value:
      stats.avgHandlingTimeSec != null
        ? formatDuration(stats.avgHandlingTimeSec)
        : '—',
    description:
      mode === 'targets' ? (
        'Assignment to closure'
      ) : (
        <div className="relative flex items-center gap-1">
          <span>Assignment to closure</span>
          <HelpTooltip
            label="Average resolution time"
            content={
              <>
                Avg resolution time:{' '}
                {stats.avgResolutionTimeSec != null
                  ? formatDuration(stats.avgResolutionTimeSec)
                  : '—'}{' '}
                — {METRIC_HELP.avgResolutionTimeSec}
              </>
            }
          />
        </div>
      ),
  }
  const resolutionCard = {
    key: 'avgResolutionTimeSec' as const,
    label: 'Avg resolution time',
    value:
      stats.avgResolutionTimeSec != null
        ? formatDuration(stats.avgResolutionTimeSec)
        : '—',
    description: 'Time from open to close',
  }
  const targetRateCard = {
    key: 'closureTargetMetRate' as const,
    label: mode === 'targets' ? 'Target met rate' : 'Closure Target',
    value: targetRate != null ? `${targetRate}%` : '—',
    description: targetCount
      ? `${count(stats.closureTargetMetCount)} of ${count(targetCount)} targeted closures met`
      : targetCount === 0
        ? 'No closed reports with a target'
        : 'Target results unavailable',
  }
  const targetCards = [
    handlingCard,
    resolutionCard,
    {
      key: 'closureTargetMetCount' as const,
      label: 'Target met',
      value: count(stats.closureTargetMetCount),
      description: 'Closed within their assigned target',
    },
    {
      key: 'closureTargetMissedCount' as const,
      label: 'Target missed',
      value: count(stats.closureTargetMissedCount),
      description: 'Closed after their assigned target',
    },
    targetRateCard,
    {
      key: 'closureTargetOverdueCount' as const,
      label: 'Past target',
      value: count(stats.closureTargetOverdueCount),
      description: 'Currently pending, unmuted reports past their target',
    },
  ]
  const trendCards = [
    inboundCard,
    {
      key: 'pendingCount' as const,
      label: 'Pending',
      value: count(stats.pendingCount),
      description:
        stats.closureTargetOverdueCount != null ? (
          <div className="flex items-center gap-1">
            <span className={STATS_COLORS.closureTargetOverdueCount.text}>
              {count(stats.closureTargetOverdueCount)} past closure target
            </span>
            <HelpTooltip
              label="About past closure target"
              content={METRIC_HELP.closureTargetOverdueCount}
            />
          </div>
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
            {stats.actionRate != null && (
              <span className="text-gray-500 dark:text-gray-400">
                {' '}
                ({stats.actionRate}%)
              </span>
            )}
          </>
        ) : (
          'Closure breakdown unavailable'
        ),
    },
    escalatedCard,
    handlingCard,
    targetRateCard,
  ]

  const compactCards = [
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
    resolutionCard,
  ]

  const cards =
    mode === 'targets' ? targetCards : compact ? compactCards : trendCards

  const visibleCards = cards.filter(
    ({ key }) =>
      showPending ||
      (key !== 'pendingCount' && key !== 'closureTargetOverdueCount'),
  )

  if (compact) {
    const updatedLabel = lastUpdated
      ? `Updated ${new Date(lastUpdated).toLocaleString()}`
      : undefined
    return (
      <section
        aria-label="Overview metrics"
        data-cy="overview-metrics"
        data-mode={mode}
        data-layout="compact"
        className="flex flex-wrap items-center gap-2"
      >
        <dl className="flex flex-wrap items-center gap-2">
          {visibleCards.map(({ key, label, value }) => (
            <div
              key={key}
              data-metric={key}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATS_COLORS[key].badge} ${STATS_COLORS[key].text}`}
            >
              <dt className="order-last inline-flex items-center gap-1">
                {label}
                <MetricHelp metric={key} label={label} />
              </dt>
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
      data-mode={mode}
      data-layout="expanded"
    >
      {periodLabel && periodLabel !== 'Today' && (
        <h2 className="mb-3 font-medium text-gray-900 dark:text-gray-100">
          {periodLabel}
        </h2>
      )}
      <dl
        className={`grid grid-cols-2 gap-3 md:grid-cols-3 ${showPending ? 'xl:grid-cols-6' : 'xl:grid-cols-5'}`}
      >
        {visibleCards.map((card) => {
          const { key, label, value, description } = card
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
                <span>{label}</span>
                <MetricHelp metric={key} label={label} />
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
            </div>
          )
        })}
      </dl>
    </section>
  )
}
