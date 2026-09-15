'use client'

import { statReasonTypes } from '@/reports/helpers/getType'
import { HistoricalGraph } from '@/reports/stats/HistoricalGraph'
import { StatValues } from '@/reports/stats/Stats'
import {
  StatsFilters,
  useParamStatsFilters,
} from '@/reports/stats/StatsFilters'
import {
  HistoricalStatsParams,
  useHistoricalStats,
} from '@/reports/stats/useReportStats'
import { usePermission } from '@/shell/ConfigurationContext'
import { ArrowLeftIcon } from '@heroicons/react/24/solid'
import Link from 'next/link'
import { useMemo } from 'react'

export function StatsDetailPageContent() {
  const canViewModeratorStats = usePermission('canViewModeratorStats')
  const { filters, handleFilterChange } = useParamStatsFilters()

  // consider aggregate if selected or if not permitted
  const isAggregate =
    filters.grouping === 'aggregate' ||
    (filters.grouping === 'moderator' && !canViewModeratorStats)

  const reportTypes = filters.category ? statReasonTypes[filters.category] : []
  const historical: HistoricalStatsParams = isAggregate
    ? {
        startDate: filters.dateRange.startDate,
        endDate: filters.dateRange.endDate,
      }
    : {
        reportTypes,
        queueId: filters.queueId,
        moderatorDid: filters.moderatorDid,
        startDate: filters.dateRange.startDate,
        endDate: filters.dateRange.endDate,
      }

  const {
    data: historicalStats,
    isLoading: histLoading,
    isError: histError,
    refetch: histRefetch,
  } = useHistoricalStats(historical)

  const totals = useMemo(() => {
    if (!historicalStats?.stats.length) return undefined

    const summed = historicalStats.stats.reduce(
      (total, day) => ({
        inboundCount: total.inboundCount + (day.inboundCount ?? 0),
        pendingCount: total.pendingCount + (day.pendingCount ?? 0),
        escalatedCount: total.escalatedCount + (day.escalatedCount ?? 0),
        actionedCount: total.actionedCount + (day.actionedCount ?? 0),
      }),
      {
        inboundCount: 0,
        pendingCount: 0,
        escalatedCount: 0,
        actionedCount: 0,
      },
    )

    return {
      ...summed,
      actionRate:
        summed.inboundCount > 0
          ? Math.round((summed.actionedCount / summed.inboundCount) * 100)
          : undefined,
    }
  }, [historicalStats])

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 space-y-4">
      <div className="flex items-center gap-4 mb-4">
        <Link href="/analytics" className="text-gray-700 dark:text-gray-100">
          <ArrowLeftIcon className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Analytics
        </h1>
      </div>

      <StatsFilters value={filters} onChange={handleFilterChange} />

      {histLoading ? (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Loading stats...
        </div>
      ) : histError ? (
        <div className="text-sm text-red-600 dark:text-red-400">
          Failed to load stats.{' '}
          <button
            onClick={() => histRefetch()}
            className="underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      ) : totals ? (
        <StatValues stats={totals} description="Totals for selected date range" />
      ) : (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          No data for the selected range.
        </div>
      )}

      <div className="rounded-lg shadow bg-white dark:bg-slate-800 p-4 dark:shadow-slate-700">
        <HistoricalGraph
          stats={historicalStats?.stats}
          isLoading={histLoading}
          isError={histError}
          onRetry={() => histRefetch()}
        />
      </div>
    </div>
  )
}
