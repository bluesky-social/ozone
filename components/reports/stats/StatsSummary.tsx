import { formatDuration } from '@/lib/util'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import { StatCard } from './Stats'
import type { StatsMetric } from './statsColors'
import type { ReportStats, StatsCoverage } from './reportStats'

type RangeSummaryProps = {
  stats: ReportStats
  coverage?: StatsCoverage
  days?: number
}

function coverageNote(value: unknown, covered?: number, days?: number) {
  return covered != null && days != null && covered < days
    ? `${covered} of ${days} days available`
    : value == null
      ? 'Unavailable'
      : undefined
}

function MetricHelp({ label, children }: { label: string; children: string }) {
  return (
    <Popover className="inline-flex">
      <PopoverButton
        aria-label={`About ${label}`}
        className="rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        <QuestionMarkCircleIcon className="h-4 w-4" />
      </PopoverButton>
      <PopoverPanel
        anchor="bottom"
        className="z-20 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700 shadow-lg [--anchor-gap:8px] dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200"
      >
        {children}
      </PopoverPanel>
    </Popover>
  )
}

export function StatsSummary({
  stats,
  coverage,
  days,
  showPending,
  pendingCount,
}: RangeSummaryProps & {
  showPending: boolean
  pendingCount?: number
}) {
  const card = (
    key: StatsMetric,
    label: string,
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
        metric={key}
        description={coverageNote(value, covered, days)}
      />
    )
  }

  return (
    <div className="space-y-5" data-cy="stats-summary">
      <section aria-label="Intake and backlog">
        <h3 className="mb-2 font-medium">Intake &amp; backlog</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {card('inboundCount', 'Inbound')}
          {showPending && (
            <StatCard
              label="Pending"
              value={pendingCount?.toLocaleString() ?? '—'}
              metric="pendingCount"
              description={
                pendingCount == null
                  ? 'Current snapshot unavailable'
                  : 'Current snapshot'
              }
            />
          )}
          {card('escalatedCount', 'Escalated')}
        </div>
      </section>
      <section aria-label="Resolved reports">
        <h3 className="mb-2 font-medium">Resolved reports</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {card('closedCount', 'Closed')}
          {card('actionedCount', 'Actioned')}
          {card('acknowledgedCount', 'Acknowledged')}
          {card('actionRate', 'Action rate', 'percent')}
          {card('labelActionCount', 'Label actions')}
          {card('takedownActionCount', 'Takedown actions')}
        </div>
      </section>
      <section aria-label="Time and closure targets">
        <h3 className="mb-2 flex items-center gap-2 font-medium">
          Time &amp; closure targets
          <MetricHelp label="time and closure targets">
            Handling time starts at assignment; resolution time starts at report
            creation. Averages are weighted by report samples. Target results
            count closures in the selected dates and exclude reports without a
            target.
          </MetricHelp>
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {card('avgHandlingTimeSec', 'Average handling time', 'duration')}
          {card('avgResolutionTimeSec', 'Average resolution time', 'duration')}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {card('closureTargetMetCount', 'Target met')}
          {card('closureTargetMissedCount', 'Target missed')}
          {card('closureTargetMetRate', 'Target met rate', 'percent')}
        </div>
      </section>
    </div>
  )
}
