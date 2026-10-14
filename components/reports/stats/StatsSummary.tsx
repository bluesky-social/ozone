import { formatDuration } from '@/lib/util'
import { StatCard, StatsValuePreset } from './Stats'
import type { ReportStats, StatsCoverage } from './reportStats'

export function StatsSummary({
  stats,
  coverage,
  days,
}: {
  stats: ReportStats
  coverage?: StatsCoverage
  days?: number
}) {
  const card = (
    key: keyof ReportStats,
    label: string,
    preset?: StatsValuePreset,
    unit?: 'duration' | 'percent',
  ) => {
    const value = stats[key]
    const covered = coverage?.[key]
    return (
      <StatCard
        key={key}
        label={label}
        value={
          typeof value === 'number'
            ? unit === 'duration'
              ? formatDuration(value)
              : value.toLocaleString()
            : '—'
        }
        suffix={value != null && unit === 'percent' ? '%' : undefined}
        classNamePreset={preset}
        description={
          covered != null && days != null && covered < days
            ? `${covered} of ${days} days available`
            : value == null
              ? 'Unavailable'
              : undefined
        }
      />
    )
  }

  return (
    <div className="space-y-5" data-cy="stats-summary">
      <section aria-label="Report activity">
        <h2 className="mb-2 font-medium">Report activity</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {card('inboundCount', 'Inbound', 'inbound')}
          {card('closedCount', 'Closed', 'closed')}
          {card('actionedCount', 'Actioned', 'actioned')}
          {card('acknowledgedCount', 'Acknowledged', 'acknowledged')}
          {card('escalatedCount', 'Escalated', 'escalated')}
          {card('actionRate', 'Action rate', undefined, 'percent')}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {card('labelActionCount', 'Label actions')}
          {card('tagActionCount', 'Tag actions')}
          {card('takedownActionCount', 'Takedown actions')}
        </div>
      </section>
      <section aria-label="Closure targets">
        <h2 className="mb-1 font-medium">Closure targets</h2>
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
          Closed reports with a target, counted on their closure date. Reports
          without a target are excluded.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {card('closureTargetMetCount', 'Target met', 'actioned')}
          {card('closureTargetMissedCount', 'Target missed', 'escalated')}
          {card(
            'closureTargetMetRate',
            'Target met rate',
            undefined,
            'percent',
          )}
        </div>
      </section>
      <section aria-label="Time to close">
        <h2 className="mb-1 font-medium">Time to close</h2>
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
          Handling time starts at assignment; resolution time starts at report
          creation. Averages are weighted by report samples.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {card(
            'avgHandlingTimeSec',
            'Average handling time',
            'avgHandlingTime',
            'duration',
          )}
          {card(
            'avgResolutionTimeSec',
            'Average resolution time',
            'avgHandlingTime',
            'duration',
          )}
        </div>
      </section>
    </div>
  )
}

export function BacklogSummary({ stats }: { stats: ReportStats }) {
  return (
    <section aria-label="Current backlog" data-cy="current-backlog">
      <h2 className="mb-1 font-medium">Current backlog</h2>
      <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
        Latest snapshot of unmuted reports, independent of the selected date
        range.
        {stats.lastUpdated &&
          ` Updated ${new Date(stats.lastUpdated).toISOString().replace('T', ' ').slice(0, 19)} UTC.`}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Pending"
          value={stats.pendingCount?.toLocaleString() ?? '—'}
          classNamePreset="pending"
        />
        <StatCard
          label="Past closure target"
          value={stats.closureTargetOverdueCount?.toLocaleString() ?? '—'}
          classNamePreset="escalated"
        />
      </div>
    </section>
  )
}
