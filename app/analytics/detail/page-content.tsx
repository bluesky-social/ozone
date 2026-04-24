'use client'

import { groupedReasonTypes } from '@/reports/helpers/getType'
import { HistoricalGraph } from '@/reports/stats/HistoricalGraph'
import { LiveStatsPanel } from '@/reports/stats/LiveStats'
import {
  StatsFilters,
  useParamStatsFilters,
} from '@/reports/stats/StatsFilters'
import {
  HistoricalStatsParams,
  LiveStatsParams,
  useHistoricalStats,
} from '@/reports/stats/useReportStats'
import { ArrowLeftIcon } from '@heroicons/react/24/solid'
import Link from 'next/link'

export function StatsDetailPageContent() {
  const { filters, handleFilterChange } = useParamStatsFilters()

  const isAggregate = filters.grouping === 'aggregate'
  const reportTypes = filters.category
    ? groupedReasonTypes[filters.category]
    : []
  const live: LiveStatsParams = isAggregate
    ? {}
    : {
        reportTypes,
        queueId: filters.queueId,
        moderatorDid: filters.moderatorDid,
      }
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

      <LiveStatsPanel params={live} />

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
