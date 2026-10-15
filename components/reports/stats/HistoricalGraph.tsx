'use client'
import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { isDarkModeEnabled } from '@/common/useColorScheme'
import { formatDuration } from '@/lib/util'
import { HistoricalReportStats, summarizeStats } from './reportStats'

import { STATS_COLORS } from './statsColors'

const VIEWS = {
  activity: {
    label: 'Activity',
    series: [
      {
        key: 'inboundCount',
        name: 'Inbound',
        color: STATS_COLORS.inboundCount.color,
      },
      {
        key: 'closedCount',
        name: 'Closed',
        color: STATS_COLORS.closedCount.color,
      },
      {
        key: 'actionedCount',
        name: 'Actioned',
        color: STATS_COLORS.actionedCount.color,
      },
      {
        key: 'acknowledgedCount',
        name: 'Acknowledged',
        color: STATS_COLORS.acknowledgedCount.color,
      },
      {
        key: 'escalatedCount',
        name: 'Escalated',
        color: STATS_COLORS.escalatedCount.color,
      },
    ],
  },
  targets: {
    label: 'Closure targets',
    series: [
      {
        key: 'closureTargetMetCount',
        name: 'Target met',
        color: STATS_COLORS.closureTargetMetCount.color,
      },
      {
        key: 'closureTargetMissedCount',
        name: 'Target missed',
        color: STATS_COLORS.closureTargetMissedCount.color,
      },
    ],
  },
  rates: {
    label: 'Rates',
    series: [
      {
        key: 'actionRate',
        name: 'Action rate',
        color: STATS_COLORS.actionRate.color,
      },
      {
        key: 'closureTargetMetRate',
        name: 'Target met rate',
        color: STATS_COLORS.closureTargetMetRate.color,
      },
    ],
  },
  durations: {
    label: 'Time to close',
    series: [
      {
        key: 'avgHandlingTimeSec',
        name: 'Average handling time',
        color: STATS_COLORS.avgHandlingTimeSec.color,
      },
      {
        key: 'avgResolutionTimeSec',
        name: 'Average resolution time',
        color: STATS_COLORS.avgResolutionTimeSec.color,
      },
    ],
  },
} as const

export function HistoricalGraph({
  stats,
  isLoading,
  isError,
  onRetry,
}: {
  stats?: HistoricalReportStats[]
  isLoading: boolean
  isError?: boolean
  onRetry?: () => void
}) {
  const [view, setView] = useState<keyof typeof VIEWS>('activity')
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set())
  const toggleSeries = (key: string) =>
    setHiddenSeries((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  if (isLoading)
    return <p className="py-12 text-center text-sm">Loading data...</p>
  if (isError)
    return (
      <p className="py-12 text-center text-sm text-red-600 dark:text-red-400">
        Failed to load data.{' '}
        {onRetry && (
          <button onClick={onRetry} className="underline">
            Retry
          </button>
        )}
      </p>
    )
  if (!stats?.length)
    return (
      <p className="py-12 text-center text-sm">
        No data for the selected range.
      </p>
    )

  const data = stats
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((day) => ({ date: day.date, ...summarizeStats([day]).stats }))
  const legacyDays = stats.filter((day) => day.closedCount == null).length
  const dark = isDarkModeEnabled()
  const axisColor = dark ? '#9ca3af' : '#6b7280'
  const series = VIEWS[view].series
  const display = (value: number) =>
    view === 'durations'
      ? formatDuration(value)
      : view === 'rates'
        ? `${value}%`
        : value.toLocaleString()
  const hasValues = data.some((day) =>
    series.some(({ key }) => day[key] != null),
  )

  return (
    <div className="w-full space-y-4" data-cy="historical-stats">
      {legacyDays > 0 && (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          {legacyDays} of {stats.length} daily snapshots use older metric
          definitions. Outcome and escalation counts include refreshed days
          only.
        </p>
      )}
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Chart metrics"
      >
        {(Object.keys(VIEWS) as (keyof typeof VIEWS)[]).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={view === key}
            onClick={() => setView(key)}
            className={`rounded-full px-3 py-1 text-sm ${view === key ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700'}`}
          >
            {VIEWS[key].label}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Missing values are unavailable. Pending and overdue appear in the
        summary above.
      </p>
      {!hasValues ? (
        <p className="py-12 text-center text-sm">
          No {VIEWS[view].label.toLowerCase()} data for this range.
        </p>
      ) : (
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              accessibilityLayer
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={dark ? '#374151' : '#e5e7eb'}
              />
              <XAxis
                dataKey="date"
                tickFormatter={(date) =>
                  new Date(date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    timeZone: 'UTC',
                  })
                }
                tick={{ fontSize: 12, fill: axisColor }}
              />
              <YAxis
                width={80}
                tickFormatter={display}
                domain={view === 'rates' ? [0, 100] : [0, 'auto']}
                allowDecimals={false}
                tick={{ fontSize: 12, fill: axisColor }}
              />
              <Tooltip
                formatter={(value: number) => display(value)}
                labelFormatter={(date) => `${date} (UTC)`}
                contentStyle={{
                  backgroundColor: dark ? '#1e293b' : '#ffffff',
                  borderColor: dark ? '#475569' : '#e5e7eb',
                  color: dark ? '#e2e8f0' : '#1f2937',
                }}
              />
              <Legend
                content={({ payload }) => (
                  <div className="flex flex-wrap justify-center gap-4 text-sm">
                    {payload?.map((entry) => {
                      const key = String(entry.dataKey)
                      const hidden = hiddenSeries.has(key)
                      return (
                        <button
                          key={key}
                          type="button"
                          aria-pressed={!hidden}
                          className="flex items-center gap-1.5"
                          style={{ opacity: hidden ? 0.45 : 1 }}
                          onClick={() => toggleSeries(key)}
                        >
                          <span
                            className="inline-block h-0.5 w-3"
                            style={{ backgroundColor: entry.color }}
                          />
                          {entry.value}
                        </button>
                      )
                    })}
                  </div>
                )}
              />
              {series.map((s) => (
                <Line
                  key={s.key}
                  type="linear"
                  dataKey={s.key}
                  name={s.name}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  hide={hiddenSeries.has(s.key)}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
