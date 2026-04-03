'use client'
import { subDays } from 'date-fns'
import Link from 'next/link'
import { Line, LineChart, ResponsiveContainer } from 'recharts'
import { getHrefFromGroup, StatGroup } from '.'
import { StatValue } from './StatValue'
import { groupedReasonTypes } from '../helpers/getType'
import { useHistoricalStats, useLiveStats } from './useReportStats'
import { LiveStatsParams } from './useReportStats'

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

  const startDate = subDays(new Date(), 7).toISOString()
  const { data: historical } = useHistoricalStats({
    ...filterParams,
    startDate,
    limit: 7,
  })

  const sparklineData = historical?.stats
    ?.slice()
    .sort(
      (a, b) =>
        new Date(a.computedAt).getTime() - new Date(b.computedAt).getTime(),
    )
    .map((s) => ({ value: s.inboundCount ?? 0 }))

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
              value={stats.inboundCount ?? 0}
              classNamePreset="inbound"
            />
            <StatValue
              label="Pending"
              value={stats.pendingCount ?? 0}
              classNamePreset="pending"
            />
            <StatValue
              label="Escalated"
              value={stats.escalatedPendingCount ?? 0}
              classNamePreset="escalated"
            />
            <StatValue
              label="Actioned"
              value={stats.actionedCount ?? 0}
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
