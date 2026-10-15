import { numberToString } from '@/lib/util'
import { STATS_COLORS, type StatsMetric } from './statsColors'

export function StatCard({
  label,
  value,
  suffix,
  metric,
  description,
}: {
  label: string
  value: string | number | undefined
  suffix?: string
  metric?: StatsMetric
  description?: string
}) {
  const displayValue = typeof value !== 'string' ? numberToString(value) : value

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800 px-4 py-4 flex flex-col gap-2 min-w-0">
      <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {metric && (
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: STATS_COLORS[metric].color }}
          />
        )}
        {label}
      </span>
      <span
        className={`text-2xl font-bold leading-tight tracking-tight break-words tabular-nums ${metric ? STATS_COLORS[metric].text : 'text-gray-900 dark:text-gray-100'}`}
      >
        {displayValue}
        {suffix && <span className="text-sm font-medium ml-1">{suffix}</span>}
      </span>
      {description && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {description}
        </span>
      )}
    </div>
  )
}
