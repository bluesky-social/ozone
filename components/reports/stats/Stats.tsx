import { numberToString } from '@/lib/util'
import { ClockIcon } from '@heroicons/react/24/outline'
import { formatDistanceToNow, subDays } from 'date-fns'
import Link from 'next/link'
import { useMemo } from 'react'
import { Line, LineChart, ResponsiveContainer } from 'recharts'
import { twMerge } from 'tailwind-merge'
import { getHrefFromGroup, StatGroup } from '.'
import { groupedReasonTypes } from '../helpers/getType'
import {
  LiveStatsParams,
  useHistoricalStats,
  useLiveStats,
} from './useReportStats'

export const STATS_PRESETS = {
  inbound: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300',
  escalated:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
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

export interface ReportStats {
  /** Number of reports in 'open' status */
  pendingCount?: number
  /** Number of reports in 'closed' status */
  actionedCount?: number
  /** Number of reports in 'escalated' status */
  escalatedCount?: number
  /** Reports received in this queue in the last 24 hours. */
  inboundCount?: number
  /** Percentage of reports actioned (actionedCount / inboundCount * 100), rounded to nearest integer. Absent when inboundCount is 0. */
  actionRate?: number
  /** Average time in seconds from report creation to close, for reports closed in this period. */
  avgHandlingTimeSec?: number
  /** When these statistics were last computed */
  lastUpdated?: string
}

export function StatValues({
  stats,
  className,
}: {
  stats: ReportStats
  className?: string
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
          label="Actioned"
          value={stats.actionedCount}
          classNamePreset="actioned"
          suffix={
            stats.actionRate != null ? ` (${stats.actionRate}%)` : undefined
          }
        />
      </div>
      {windowHours && (
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
      )}
    </div>
  )
}

export function StatCard({
  label,
  value,
  suffix,
  classNamePreset,
}: {
  label: string
  value: string | number | undefined
  suffix?: string
  classNamePreset?: StatsValuePreset
}) {
  const displayValue = typeof value !== 'string' ? numberToString(value) : value

  return (
    <div
      className={twMerge(
        'rounded-lg px-4 py-3 flex flex-col gap-1',
        classNamePreset ? STATS_PRESETS[classNamePreset] : '',
      )}
    >
      <span className="text-xs font-medium opacity-80">{label}</span>
      <span className="text-2xl font-bold leading-tight">
        {displayValue}
        {suffix && <span className="text-sm font-medium ml-1">{suffix}</span>}
      </span>
    </div>
  )
}

export function StatsCard({ group }: { group: StatGroup }) {
  const filterParams: LiveStatsParams = {
    reportTypes: group.category
      ? groupedReasonTypes[group.category]
      : undefined,
    queueId: group.queueId,
    moderatorDid: group.moderatorDid,
  }

  const {
    data: stats,
    isLoading,
    isError,
    refetch,
  } = useLiveStats(filterParams)

  const startDate = useMemo(() => subDays(new Date(), 7).toISOString(), [])
  const { data: historical } = useHistoricalStats({
    ...filterParams,
    startDate,
    limit: 7,
  })

  const sparklineData = historical?.stats
    ?.slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((s) => ({ value: s.inboundCount }))

  const showGraph = sparklineData && sparklineData.length > 1

  if (isError) {
    return (
      <div className="rounded-lg shadow bg-white dark:bg-slate-800 p-4 dark:shadow-slate-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {group.title}
        </h3>
        <div className="text-sm text-red-600 dark:text-red-400">
          Failed to load stats.{' '}
          <button
            onClick={(e) => {
              e.preventDefault()
              refetch()
            }}
            className="underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <Link
      href={getHrefFromGroup(group)}
      className="block rounded-lg shadow bg-white dark:bg-slate-800 p-4 dark:shadow-slate-700 hover:shadow-md transition-shadow"
    >
      <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {group.title}
      </h2>
      {group.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {group.description}
        </p>
      )}

      {isLoading ? (
        <div className="text-xs text-gray-400">Loading...</div>
      ) : !stats ? (
        <div className="text-xs text-gray-400">No data</div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-3">
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
              label="Actioned"
              value={stats.actionedCount}
              classNamePreset="actioned"
              suffix={
                stats.actionRate != null ? ` (${stats.actionRate}%)` : undefined
              }
            />
          </div>

          <div className="h-32 w-full">
            {showGraph ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex justify-center items-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  No data to show
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </Link>
  )
}
