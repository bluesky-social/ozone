import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ClosureBreakdown } from './ClosureBreakdown'
import { getStatsWindow, type StatsWindow } from './statsWindow'
import { useHistoricalStats } from './useReportStats'
import type { WindowStats } from './useStatsWindow'

import { STATS_COLORS } from './statsColors'

const SERIES = [
  {
    key: 'inboundCount',
    label: 'Inbound',
    color: STATS_COLORS.inboundCount.color,
  },
  {
    key: 'closedCount',
    label: 'Closed',
    color: STATS_COLORS.closedCount.color,
  },
] as const

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00.000Z`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })

export function OverviewActivity({
  window,
  data,
}: {
  window: StatsWindow
  data: WindowStats
}) {
  const today = window.endDate.slice(0, 10)
  const chartWindow = useMemo(
    () => (window.period === 'Today' ? getStatsWindow('7d', today) : window),
    [window, today],
  )
  const { dates } = chartWindow
  const {
    data: history,
    isLoading,
    isError,
    refetch,
  } = useHistoricalStats(
    {
      startDate: chartWindow.startDate,
      endDate: chartWindow.endDate,
      limit: chartWindow.days,
    },
    { refetchInterval: 5 * 60 * 1000 },
  )
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set())
  const toggleSeries = (key: string) =>
    setHiddenSeries((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  const rows = useMemo(() => {
    const byDate = new Map(history?.stats.map((row) => [row.date, row]))
    return dates.map((date) => ({
      date,
      inboundCount: byDate.get(date)?.inboundCount,
      closedCount: byDate.get(date)?.closedCount,
    }))
  }, [history, dates])
  const hasData = rows.some(
    (row) => row.inboundCount != null || row.closedCount != null,
  )
  const partialCoverage = rows.some(
    (row) => row.inboundCount == null || row.closedCount == null,
  )

  return (
    <div className="mb-6 grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      <section
        aria-label="Inbound vs closed"
        data-cy="inbound-closed-chart"
        className="flex min-w-0 flex-col rounded-xl border border-gray-200 bg-white p-4 text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 sm:p-5"
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Inbound vs closed</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {chartWindow.label} · {formatDate(dates[0])}
              {chartWindow.days > 1 ? ` – ${formatDate(today)}` : ''} (UTC).
              Today is partial.
            </p>
          </div>
          <div role="group" aria-label="Chart series" className="flex gap-4">
            {SERIES.map(({ key, label, color }) => (
              <button
                key={key}
                type="button"
                aria-pressed={!hiddenSeries.has(key)}
                onClick={() => toggleSeries(key)}
                className={`flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 ${hiddenSeries.has(key) ? 'opacity-50' : ''}`}
              >
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: color }}
                />
                {label}
              </button>
            ))}
          </div>
        </div>
        {isLoading ? (
          <p
            role="status"
            className="py-20 text-center text-sm text-gray-500 dark:text-gray-400"
          >
            Loading daily stats...
          </p>
        ) : isError ? (
          <p
            role="alert"
            className="py-20 text-center text-sm text-red-600 dark:text-red-400"
          >
            Failed to load daily stats.{' '}
            <button
              type="button"
              onClick={() => refetch()}
              className="underline"
            >
              Retry
            </button>
          </p>
        ) : !hasData ? (
          <p className="py-20 text-center text-sm text-gray-500 dark:text-gray-400">
            No daily stats available for this period.
          </p>
        ) : (
          <>
            <div className="relative min-h-[16rem] flex-1 text-gray-500 dark:text-gray-400">
              <div className="absolute inset-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={rows}
                    margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
                    barGap={2}
                    accessibilityLayer
                  >
                    <CartesianGrid
                      vertical={false}
                      stroke="currentColor"
                      className="text-gray-100 dark:text-slate-700"
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      minTickGap={24}
                      tick={{ fill: 'currentColor', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      width={52}
                      allowDecimals={false}
                      tickFormatter={(value: number) =>
                        value.toLocaleString(undefined, { notation: 'compact' })
                      }
                      tick={{ fill: 'currentColor', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'currentColor', opacity: 0.08 }}
                      content={({ active, label }) => {
                        const row = rows.find((row) => row.date === label)
                        if (!active || !row) return null
                        return (
                          <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-900 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100">
                            <p className="mb-2 font-medium">
                              {row.date} (UTC)
                              {row.date === today ? ' · Partial day' : ''}
                            </p>
                            {SERIES.filter(
                              ({ key }) => !hiddenSeries.has(key),
                            ).map(({ key, label }) => (
                              <p key={key}>
                                {label}:{' '}
                                {row[key]?.toLocaleString() ?? 'Unavailable'}
                              </p>
                            ))}
                          </div>
                        )
                      }}
                    />
                    {SERIES.map(({ key, label, color }) => (
                      <Bar
                        key={key}
                        dataKey={key}
                        name={label}
                        fill={color}
                        radius={[3, 3, 0, 0]}
                        maxBarSize={20}
                        hide={hiddenSeries.has(key)}
                        isAnimationActive={false}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {partialCoverage && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Some daily counts are unavailable. Hover or focus a date to
                inspect its values.
              </p>
            )}
            <table className="sr-only">
              <caption>Daily inbound and closed report counts (UTC)</caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Inbound</th>
                  <th scope="col">Closed</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.date}>
                    <th scope="row">{row.date}</th>
                    <td>
                      {row.inboundCount?.toLocaleString() ?? 'Unavailable'}
                    </td>
                    <td>
                      {row.closedCount?.toLocaleString() ?? 'Unavailable'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>
      <ClosureBreakdown
        stats={data.rows}
        days={window.days}
        periodLabel={window.label}
        isLoading={data.isLoading}
        isError={data.isError}
        onRetry={() => data.refetch()}
      />
    </div>
  )
}
