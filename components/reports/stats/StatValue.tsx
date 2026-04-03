import { numberToString } from '@/lib/util'
import { twMerge } from 'tailwind-merge'

export const STATS_PRESETS = {
  inbound: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  pending:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  escalated: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  actioned:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  avgHandlingTime:
    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
}

export type StatsValuePreset = keyof typeof STATS_PRESETS

export function StatValue({
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
