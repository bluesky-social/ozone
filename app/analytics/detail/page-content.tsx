'use client'

import { statReasonTypes } from '@/reports/helpers/getType'
import { HistoricalGraph } from '@/reports/stats/HistoricalGraph'
import { LiveStatsCards } from '@/reports/stats/LiveStats'
import { StatsSummary } from '@/reports/stats/StatsSummary'
import { summarizeStats } from '@/reports/stats/reportStats'
import {
  StatsFilters,
  useParamStatsFilters,
} from '@/reports/stats/StatsFilters'
import {
  LiveStatsParams,
  useHistoricalStats,
} from '@/reports/stats/useReportStats'
import { usePermission } from '@/shell/ConfigurationContext'
import { ArrowLeftIcon } from '@heroicons/react/24/solid'
import Link from 'next/link'
import { useMemo } from 'react'

export function StatsDetailPageContent() {
  const canViewModeratorStats = usePermission('canViewModeratorStats')
  const { filters, handleFilterChange } = useParamStatsFilters()
  // Select exactly one dimension, including when filters arrive via a URL.
  const scope: LiveStatsParams =
    filters.grouping === 'queue'
      ? { queueId: filters.queueId }
      : filters.grouping === 'category'
        ? {
            reportTypes: filters.category
              ? statReasonTypes[filters.category]
              : undefined,
          }
        : filters.grouping === 'moderator' && canViewModeratorStats
          ? { moderatorDid: filters.moderatorDid }
          : {}

  const { data, isLoading, isError, refetch } = useHistoricalStats({
    ...scope,
    startDate: filters.dateRange.startDate,
    endDate: filters.dateRange.endDate,
    limit: 100,
  })
  const summary = useMemo(() => summarizeStats(data?.stats ?? []), [data])
  const start = filters.dateRange.startDate?.slice(0, 10)
  const end = filters.dateRange.endDate?.slice(0, 10)
  const rangeDays =
    start && end
      ? Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1
      : 0
  const expectedDays = Math.max(
    data?.stats.length ?? 0,
    Number.isFinite(rangeDays) ? rangeDays : 0,
  )

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 space-y-6 text-gray-900 dark:text-gray-100">
      <div className="flex items-center gap-4">
        <Link
          href="/analytics"
          aria-label="Back to analytics"
          className="text-gray-700 dark:text-gray-100"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-semibold">Report analytics</h1>
      </div>
      <StatsFilters
        value={
          filters.grouping === 'moderator' && !canViewModeratorStats
            ? { ...filters, grouping: 'aggregate' }
            : filters
        }
        onChange={handleFilterChange}
      />
      {!scope.moderatorDid && <LiveStatsCards params={scope} backlogOnly />}
      <section aria-label="Selected date range" className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Selected date range</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {start} – {end} (UTC)
          </p>
        </div>
        {isLoading ? (
          <p>Loading stats...</p>
        ) : isError ? (
          <p role="alert">
            Failed to load stats.{' '}
            <button onClick={() => refetch()} className="underline">
              Retry
            </button>
          </p>
        ) : data?.stats.length ? (
          <>
            {data.stats.length < expectedDays && (
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {data.stats.length} of {expectedDays} daily snapshots available
                in this view.
                {data.cursor &&
                  data.stats.length === 100 &&
                  ' This view is limited to 100 snapshots; select a shorter range to include all days.'}
              </p>
            )}
            <StatsSummary {...summary} days={expectedDays} />
          </>
        ) : (
          <p>No data for the selected range.</p>
        )}
      </section>
      <section
        className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4"
        aria-label="Daily trends"
      >
        <h2 className="mb-3 font-medium">Daily trends (UTC)</h2>
        <HistoricalGraph
          stats={data?.stats}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
        />
      </section>
    </div>
  )
}
