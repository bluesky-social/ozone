import { STATS_COLORS } from './statsColors'
import { HistoricalReportStats, summarizeStats } from './reportStats'

const ACTIONS = [
  {
    key: 'labelActionCount',
    label: 'Label',
    color: STATS_COLORS.labelActionCount.color,
  },
  {
    key: 'takedownActionCount',
    label: 'Takedown',
    color: STATS_COLORS.takedownActionCount.color,
  },
] as const

export function ClosureBreakdown({
  stats,
  days,
  periodLabel,
  isLoading,
  isError,
  onRetry,
}: {
  stats: HistoricalReportStats[]
  days: number
  periodLabel: string
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}) {
  // The two outcomes and their denominator must cover the same snapshots.
  const closureDays = stats.filter(
    (day) =>
      day.closedCount != null &&
      day.actionedCount != null &&
      day.acknowledgedCount != null,
  )
  const { stats: totals } = summarizeStats(closureDays)
  const actionDays = closureDays.filter((day) =>
    ACTIONS.every(({ key }) => day[key] != null),
  )
  const { stats: actions } = summarizeStats(actionDays)
  const maxActionCount = Math.max(
    1,
    ...ACTIONS.map(({ key }) => actions[key] ?? 0),
  )
  const showSplit =
    totals.closedCount != null &&
    totals.closedCount > 0 &&
    totals.actionedCount! + totals.acknowledgedCount! === totals.closedCount

  return (
    <section
      aria-label="Closed: acknowledged vs actioned"
      data-cy="closure-breakdown"
      className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 sm:p-5"
    >
      <h2 className="font-semibold">Closed: acknowledged vs actioned</h2>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {periodLabel} · Today is partial.
      </p>
      {isLoading ? (
        <p
          role="status"
          className="py-20 text-center text-sm text-gray-500 dark:text-gray-400"
        >
          Loading closure stats...
        </p>
      ) : isError ? (
        <p
          role="alert"
          className="py-20 text-center text-sm text-red-600 dark:text-red-400"
        >
          Failed to load closure stats.{' '}
          <button type="button" onClick={onRetry} className="underline">
            Retry
          </button>
        </p>
      ) : (
        <>
          <div className="mt-5 flex items-baseline gap-2">
            <span
              data-cy="closure-action-rate"
              className="text-4xl font-bold tracking-tight tabular-nums"
            >
              {totals.actionRate != null ? `${totals.actionRate}%` : '—'}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              action rate
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {totals.closedCount == null
              ? 'Closure outcomes unavailable.'
              : totals.closedCount === 0
                ? 'No reports closed in this period.'
                : `${totals.closedCount.toLocaleString()} closed reports with comparable outcomes.`}
          </p>
          {showSplit && (
            <div
              aria-hidden="true"
              className="mt-4 flex h-3 overflow-hidden rounded-full"
              style={{ backgroundColor: STATS_COLORS.acknowledgedCount.color }}
            >
              <div
                style={{
                  backgroundColor: STATS_COLORS.actionedCount.color,
                  width: `${(totals.actionedCount! / totals.closedCount!) * 100}%`,
                }}
              />
            </div>
          )}
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {(
              [
                {
                  key: 'actionedCount',
                  label: 'Actioned',
                  color: STATS_COLORS.actionedCount.color,
                },
                {
                  key: 'acknowledgedCount',
                  label: 'Acknowledged',
                  color: STATS_COLORS.acknowledgedCount.color,
                },
              ] as const
            ).map(({ key, label, color }) => (
              <div key={key}>
                <dt className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: color }}
                  />
                  {label}
                </dt>
                <dd className="mt-1 font-semibold tabular-nums">
                  {totals[key]?.toLocaleString() ?? '—'}
                </dd>
              </div>
            ))}
          </dl>
          {closureDays.length < days && (
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
              Comparable closure outcomes available for {closureDays.length} of{' '}
              {days} days.
            </p>
          )}
          <div className="mt-5 border-t border-gray-200 pt-4 dark:border-slate-700">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Action type
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Last action linked to each report’s current closure.
            </p>
            <dl className="mt-3 space-y-3">
              {ACTIONS.map(({ key, label, color }) => (
                <div key={key} className="flex items-center gap-3 text-xs">
                  <dt className="w-16 shrink-0 text-gray-600 dark:text-gray-300">
                    {label}
                  </dt>
                  <dd className="flex flex-1 items-center gap-3">
                    <div
                      aria-hidden="true"
                      className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700"
                    >
                      {actions[key] != null && (
                        <div
                          className="h-full rounded-full"
                          style={{
                            backgroundColor: color,
                            width: `${(actions[key]! / maxActionCount) * 100}%`,
                          }}
                        />
                      )}
                    </div>
                    <span className="min-w-[2.5rem] text-right font-semibold tabular-nums">
                      {actions[key]?.toLocaleString() ?? '—'}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
            {actionDays.length < days && (
              <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
                Action types available for {actionDays.length} of {days} days.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  )
}
