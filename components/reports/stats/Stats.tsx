import { numberToString } from '@/lib/util'
import { ClockIcon } from '@heroicons/react/24/outline'
import { formatDistanceToNow } from 'date-fns'
import { twMerge } from 'tailwind-merge'
import type { ReportStats } from './reportStats'

const STATS_PRESETS = {
  inbound: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300',
  escalated:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  actioned:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  closed:
    'bg-slate-100 text-slate-800 dark:bg-slate-700/50 dark:text-slate-300',
  acknowledged:
    'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  avgHandlingTime:
    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
}

export type StatsValuePreset = keyof typeof STATS_PRESETS

function StatValue({
  label,
  value,
  classNamePreset,
  className,
  suffix,
}: {
  label: string
  value: string | number | undefined
  classNamePreset?: StatsValuePreset
  className?: string
  suffix?: string
}) {
  const displayValue = typeof value !== 'string' ? numberToString(value) : value

  return (
    <span
      className={twMerge(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        classNamePreset && STATS_PRESETS[classNamePreset],
        className,
      )}
    >
      <strong>{displayValue}</strong>
      {label}
      {suffix}
    </span>
  )
}

export function StatValues({
  stats,
  className,
  description,
}: {
  stats: ReportStats
  className?: string
  description?: string
}) {
  const from = new Date()
  from.setUTCHours(0, 0, 0, 0) // stats are calculated from UTC midnight
  const to = stats.lastUpdated ? new Date(stats.lastUpdated) : null
  const windowHours = to
    ? Math.max(1, Math.round((to.getTime() - from.getTime()) / 3600000))
    : null

  return (
    <div className={twMerge('flex items-center gap-1 mb-3', className)}>
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
          value={stats.escalatedCount}
          classNamePreset="escalated"
        />
        <StatValue
          label="Closed"
          value={stats.closedCount}
          classNamePreset="closed"
        />
        <StatValue
          label="Actioned"
          value={stats.actionedCount}
          classNamePreset="actioned"
          suffix={
            stats.actionRate != null ? ` (${stats.actionRate}%)` : undefined
          }
        />
        <StatValue
          label="Acknowledged"
          value={stats.acknowledgedCount}
          classNamePreset="acknowledged"
        />
      </div>
      {description ? (
        <div className="text-xs text-gray-400 dark:text-gray-500">
          {description}
        </div>
      ) : windowHours ? (
        <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
          <span>
            Stats from last {windowHours} hour
            {windowHours === 1 ? '' : 's'}{' '}
          </span>
          {to && (
            <span
              title={`Updated ${formatDistanceToNow(to, { addSuffix: true })}`}
            >
              <ClockIcon className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function StatCard({
  label,
  value,
  suffix,
  classNamePreset,
  description,
}: {
  label: string
  value: string | number | undefined
  suffix?: string
  classNamePreset?: StatsValuePreset
  description?: string
}) {
  const displayValue = typeof value !== 'string' ? numberToString(value) : value

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800 px-4 py-4 flex flex-col gap-2 min-w-0">
      <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {classNamePreset && (
          <span
            aria-hidden="true"
            className={twMerge(
              'h-2 w-2 shrink-0 rounded-full',
              STATS_PRESETS[classNamePreset],
            )}
          />
        )}
        {label}
      </span>
      <span className="text-2xl font-bold leading-tight tracking-tight break-words tabular-nums text-gray-900 dark:text-gray-100">
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
