'use client'
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
import { format } from 'date-fns'
import { isDarkModeEnabled } from '@/common/useColorScheme'
import { formatDuration } from '@/lib/util'
import { StatCard } from './Stats'
import type { HistoricalReportStats } from './useReportStats'

const SERIES = [
  { key: 'inboundCount', name: 'Inbound', color: '#3b82f6' },
  { key: 'pendingCount', name: 'Pending (snapshot)', color: '#eab308' },
  { key: 'escalatedCount', name: 'Escalated', color: '#ef4444' },
  { key: 'closedCount', name: 'Closed', color: '#64748b' },
  { key: 'actionedCount', name: 'Actioned', color: '#22c55e' },
  { key: 'acknowledgedCount', name: 'Acknowledged', color: '#06b6d4' },
] as const

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
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px] text-sm text-gray-500 dark:text-gray-400">
        Loading data...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-sm text-red-600 dark:text-red-400">
        Failed to load data.
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 underline hover:no-underline"
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  if (!stats || stats.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-sm text-gray-500 dark:text-gray-400">
        No data for the selected range.
      </div>
    )
  }

  const data = stats
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((s) => ({
      date: format(new Date(s.date), 'MMM d'),
      inboundCount: s.inboundCount,
      actionedCount: s.actionedCount,
      closedCount: s.closedCount,
      acknowledgedCount: s.acknowledgedCount,
      pendingCount: s.pendingCount,
      escalatedCount: s.escalatedCount,
    }))

  const sum = (key: keyof HistoricalReportStats) =>
    stats.reduce((total, stat) => total + Number(stat[key] ?? 0), 0)
  const closedCount = sum('closedCount')
  const actionedCount = sum('actionedCount')
  const ahtSampleCount = sum('ahtSampleCount')
  const ahtDurationSec = sum('ahtDurationSec')
  const moderatorSampleCount = sum('moderatorHandlingSampleCount')
  const moderatorDurationSec = sum('moderatorHandlingDurationSec')
  const latestPending = [...stats]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .find((stat) => stat.pendingCount != null)?.pendingCount

  const dark = isDarkModeEnabled()
  const axisColor = dark ? '#9ca3af' : '#6b7280'
  const gridColor = dark ? '#374151' : '#e5e7eb'

  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Inbound"
          value={sum('inboundCount')}
          classNamePreset="inbound"
        />
        <StatCard
          label="Latest Pending"
          value={latestPending}
          classNamePreset="pending"
        />
        <StatCard label="Closed" value={closedCount} classNamePreset="closed" />
        <StatCard
          label="Actioned"
          value={actionedCount}
          suffix={
            closedCount > 0
              ? `${Math.round((actionedCount / closedCount) * 100)}%`
              : undefined
          }
          classNamePreset="actioned"
        />
        <StatCard
          label="AHT"
          value={
            ahtSampleCount > 0
              ? formatDuration(Math.round(ahtDurationSec / ahtSampleCount))
              : undefined
          }
          classNamePreset="avgHandlingTime"
        />
        <StatCard
          label="Moderator Handling"
          value={
            moderatorSampleCount > 0
              ? formatDuration(
                  Math.round(moderatorDurationSec / moderatorSampleCount),
                )
              : undefined
          }
          classNamePreset="avgHandlingTime"
        />
      </div>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: axisColor }}
              tickLine={{ stroke: axisColor }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: axisColor }}
              tickLine={{ stroke: axisColor }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: dark ? '#1e293b' : '#ffffff',
                borderColor: dark ? '#475569' : '#e5e7eb',
                color: dark ? '#e2e8f0' : '#1f2937',
              }}
            />
            <Legend />
            {SERIES.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
