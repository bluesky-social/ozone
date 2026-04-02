'use client'
import { categoryToReportTypes } from '@/reports/ReportCategorySelect'
import { REPORT_CATEGORIES } from '@/reports/stats'
import { HistoricalGraph } from '@/reports/stats/HistoricalGraph'
import { LiveStatsPanel } from '@/reports/stats/LiveStatsPanel'
import { StatsFilters, useStatsFilters } from '@/reports/stats/StatsFilters'
import {
  HistoricalStatsParams,
  LiveStatsParams,
  useHistoricalStats,
} from '@/reports/stats/useMockReportStats'
import { ArrowLeftIcon } from '@heroicons/react/24/solid'
import Link from 'next/link'
import { useTitle } from 'react-use'

export function StatsDetailPageContent() {
  const { filters, handleFilterChange } = useStatsFilters()

  const categoryTitle = filters.category
    ? REPORT_CATEGORIES.find((c) => c.key === filters.category)?.title
    : undefined
  const pageTitle = categoryTitle ? `Analytics: ${categoryTitle}` : 'Analytics'
  useTitle(pageTitle)

  const allReportTypes = [
    ...categoryToReportTypes(filters.category),
    ...filters.reportTypes,
  ]

  const liveParams: LiveStatsParams = {
    reportTypes: allReportTypes.length > 0 ? allReportTypes : undefined,
    queueId: filters.queueId,
  }

  const historicalParams: HistoricalStatsParams = {
    reportTypes: allReportTypes.length > 0 ? allReportTypes : undefined,
    queueId: filters.queueId,
    startDate: filters.dateRange.startDate,
    endDate: filters.dateRange.endDate,
  }

  const {
    data: historicalStats,
    isLoading: histLoading,
    isError: histError,
    refetch: histRefetch,
  } = useHistoricalStats(historicalParams)

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4">
      <div className="flex items-center gap-4 mb-4">
        <Link href="/analytics" className="text-gray-700 dark:text-gray-100">
          <ArrowLeftIcon className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {pageTitle}
        </h1>
      </div>

      <StatsFilters value={filters} onChange={handleFilterChange} />

      <div className="mb-6">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          Last 24 hours
        </h2>
        <LiveStatsPanel params={liveParams} />
      </div>

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
