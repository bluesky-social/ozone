import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid'
import {
  DETAIL_STATS_PERIODS,
  DetailStatsDateRange,
  getDetailStatsWindow,
  moveDetailStatsWindow,
} from './detailStatsWindow'

const labels = { day: 'Day', week: 'Week', month: 'Month', quarter: 'Quarter' }
const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

function formatDate(value?: string) {
  if (!value) return '…'
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) &&
    date.toISOString().startsWith(value.slice(0, 10))
    ? dateFormat.format(date)
    : value.slice(0, 10)
}

export function StatsWindowPicker({
  value,
  onChange,
}: {
  value: DetailStatsDateRange
  onChange: (value: DetailStatsDateRange) => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const previous = moveDetailStatsWindow(value, -1, today)
  const next = moveDetailStatsWindow(value, 1, today)

  return (
    <div className="space-y-2">
      <div
        role="group"
        aria-label="Statistics period"
        className="flex rounded-full bg-gray-100 p-1 dark:bg-slate-800"
      >
        {DETAIL_STATS_PERIODS.map((period) => (
          <button
            key={period}
            type="button"
            aria-pressed={value.period === period}
            onClick={() =>
              onChange(getDetailStatsWindow(period, value.endDate, today))
            }
            className={`flex-1 rounded-full px-3 py-1.5 text-sm transition-colors ${
              value.period === period
                ? 'bg-white font-semibold text-gray-900 shadow-sm dark:bg-slate-600 dark:text-gray-100'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
            }`}
          >
            {labels[period]}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-1 text-xs text-gray-500 dark:text-gray-400">
        <button
          type="button"
          aria-label="Previous time window"
          disabled={!previous}
          onClick={() => previous && onChange(previous)}
          className="rounded p-2 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-slate-800"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <span aria-label="Selected time window" className="text-center">
          {formatDate(value.startDate)}
          {value.startDate?.slice(0, 10) !== value.endDate?.slice(0, 10) &&
            ` – ${formatDate(value.endDate)}`}{' '}
          (UTC)
        </span>
        <button
          type="button"
          aria-label="Next time window"
          disabled={!next}
          onClick={() => next && onChange(next)}
          className="rounded p-2 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-slate-800"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
