'use client'

import { statReasonTypes } from '@/reports/helpers/getType'
import { REPORT_CATEGORIES } from '@/reports/stats'
import { HistoricalGraph } from '@/reports/stats/HistoricalGraph'
import { StatsSummary } from '@/reports/stats/StatsSummary'
import { OverviewStats } from '@/reports/stats/OverviewStats'
import { StatsWindowPicker } from '@/reports/stats/StatsWindowPicker'
import { summarizeStats } from '@/reports/stats/reportStats'
import { useParamStatsFilters } from '@/reports/stats/useParamStatsFilters'
import {
  LiveStatsParams,
  useHistoricalStats,
  useLiveStats,
} from '@/reports/stats/useReportStats'
import { usePermission } from '@/shell/ConfigurationContext'
import { ArrowLeftIcon, ChevronDownIcon } from '@heroicons/react/24/solid'
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

  const scopeTitle =
    scope.queueId != null
      ? scope.queueId === -1
        ? 'Unqueued reports'
        : `Queue ${scope.queueId}`
      : scope.reportTypes
        ? (REPORT_CATEGORIES.find(
            (category) => category.category === filters.category,
          )?.title ?? filters.category)
        : scope.moderatorDid
          ? 'Moderator analytics'
          : 'Report analytics'
  const live = useLiveStats(scope, { enabled: !scope.moderatorDid })

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
    <div className="px-4 sm:px-6 lg:px-8 py-4 space-y-4 text-gray-900 dark:text-gray-100">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="flex items-center gap-4 pt-2">
          <Link
            href="/analytics"
            aria-label="Back to analytics"
            className="text-gray-700 dark:text-gray-100"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">{scopeTitle}</h1>
            {scope.moderatorDid && (
              <p className="break-all text-xs text-gray-500 dark:text-gray-400">
                {scope.moderatorDid}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-start gap-3 lg:justify-end">
          <StatsWindowPicker
            value={filters.dateRange}
            onChange={(dateRange) =>
              handleFilterChange({ ...filters, dateRange })
            }
          />
        </div>
      </div>
      <section aria-label="Selected date range" className="space-y-3">
        {isLoading ? (
          <p>Loading stats...</p>
        ) : isError ? (
          <p role="alert">
            Failed to load stats.{' '}
            <button onClick={() => refetch()} className="underline">
              Retry
            </button>
          </p>
        ) : data?.stats.length || live.data?.lastUpdated ? (
          <>
            <OverviewStats
              {...summary}
              stats={{
                ...summary.stats,
                pendingCount: live.isError
                  ? undefined
                  : live.data?.pendingCount,
                closureTargetOverdueCount: live.isError
                  ? undefined
                  : live.data?.closureTargetOverdueCount,
              }}
              rows={data?.stats ?? []}
              lastUpdated={live.data?.lastUpdated}
              days={expectedDays}
              showPending={!scope.moderatorDid}
              mode="expanded"
            />
            {data && data.stats.length < expectedDays && (
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {data.stats.length} of {expectedDays} daily snapshots available
                in this view.
                {data.cursor &&
                  data.stats.length === 100 &&
                  ' This view is limited to 100 snapshots; select a shorter range to include all days.'}
              </p>
            )}
          </>
        ) : (
          <p>No data for the selected range.</p>
        )}
      </section>
      {!scope.moderatorDid &&
        (live.isLoading ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Loading current backlog...
          </p>
        ) : live.isError ? (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            Failed to load current backlog.{' '}
            <button
              type="button"
              onClick={() => live.refetch()}
              className="underline"
            >
              Retry
            </button>
          </p>
        ) : live.data?.lastUpdated ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Current backlog updated{' '}
            <time dateTime={live.data.lastUpdated}>
              {new Date(live.data.lastUpdated).toLocaleString()}
            </time>
          </p>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            No current backlog snapshot available.
          </p>
        ))}
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
      {!isLoading && !isError && !!data?.stats.length && (
        <details
          className="group rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
          data-cy="detailed-metrics"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium [&::-webkit-details-marker]:hidden">
            Detailed metrics
            <ChevronDownIcon className="h-4 w-4 text-gray-500 transition-transform group-open:rotate-180 dark:text-gray-400" />
          </summary>
          <div className="mt-5">
            <StatsSummary
              {...summary}
              days={expectedDays}
              showPending={!scope.moderatorDid}
              pendingCount={live.isError ? undefined : live.data?.pendingCount}
            />
          </div>
        </details>
      )}
    </div>
  )
}
