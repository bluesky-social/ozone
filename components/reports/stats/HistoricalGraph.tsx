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
import { HistoricalReportStats, summarizeStats } from './reportStats'

import { STATS_COLORS } from './statsColors'

const VIEWS = {
  trends: {
    label: 'Trends',
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
        key: 'pendingCount',
        name: 'Pending',
        color: STATS_COLORS.pendingCount.color,
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
} as const

export type HistoricalStatsView = keyof typeof VIEWS

export function HistoricalGraph({
  view,
  stats,
  isLoading,
  isError,
  onRetry,
  showPending = true,
}: {
  view: HistoricalStatsView
  stats?: HistoricalReportStats[]
  isLoading: boolean
  isError?: boolean
  onRetry?: () => void
  showPending?: boolean
}) {
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
    .map((day) => ({
      date: day.date,
      ...summarizeStats([day]).stats,
      pendingCount: day.pendingCount,
    }))
  const dark = isDarkModeEnabled()
  const axisColor = dark ? '#9ca3af' : '#6b7280'
  const series = VIEWS[view].series.filter(
    ({ key }) => key !== 'pendingCount' || showPending,
  )
  const hasPendingSeries = series.some(({ key }) => key === 'pendingCount')
  const display = (value: number) => value.toLocaleString()
  const hasValues = data.some((day) =>
    series.some(({ key }) => day[key] != null),
  )

  return (
    <div className="w-full space-y-4" data-cy="historical-stats">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {hasPendingSeries
          ? 'Daily activity uses the left axis. Pending uses the right axis: unmuted backlog at the end of each UTC day, or the latest snapshot for today. Missing values are unavailable.'
          : 'Missing values are unavailable.'}
      </p>
      {!hasValues ? (
        <p className="py-12 text-center text-sm">
          No {VIEWS[view].label.toLowerCase()} data for this range.
        </p>
      ) : (
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              className="[&_.recharts-surface:focus:not(:focus-visible)]:outline-none"
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
                yAxisId="flow"
                width={80}
                tickFormatter={display}
                domain={[0, 'auto']}
                allowDecimals={false}
                tick={{ fontSize: 12, fill: axisColor }}
              />
              {hasPendingSeries && (
                <YAxis
                  yAxisId="pending"
                  orientation="right"
                  width={80}
                  tickFormatter={display}
                  domain={[0, 'auto']}
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: STATS_COLORS.pendingCount.color }}
                />
              )}
              <Tooltip
                formatter={(value: number) => display(value)}
                labelFormatter={(date) => `${date}`}
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
                          className="flex items-center gap-1.5 select-none text-gray-700 dark:text-gray-200"
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
                  yAxisId={s.key === 'pendingCount' ? 'pending' : 'flow'}
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
      <div className="sr-only">
        <table>
          <caption>{VIEWS[view].label} by UTC date</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              {series.map(({ key, name }) => (
                <th key={key} scope="col">
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((day) => (
              <tr key={day.date}>
                <th scope="row">{day.date}</th>
                {series.map(({ key }) => (
                  <td key={key}>
                    {day[key]?.toLocaleString() ?? 'Unavailable'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
