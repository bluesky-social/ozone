'use client'

import { useQueueById } from '@/queues/useQueues'
import { statReasonTypes } from '@/reports/helpers/getType'
import { REPORT_CATEGORIES } from '@/reports/stats'
import { HistoricalGraph } from '@/reports/stats/HistoricalGraph'
import {
  OverviewStats,
  type OverviewStatsMode,
} from '@/reports/stats/OverviewStats'
import { StatsWindowPicker } from '@/reports/stats/StatsWindowPicker'
import { summarizeStats } from '@/reports/stats/reportStats'
import { useParamStatsFilters } from '@/reports/stats/useParamStatsFilters'
import {
  LiveStatsParams,
  useHistoricalStats,
  useLiveStats,
} from '@/reports/stats/useReportStats'
import { usePermission } from '@/shell/ConfigurationContext'
import { ArrowLeftIcon } from '@heroicons/react/24/solid'
import Link from 'next/link'
import { useMemo, useState } from 'react'

const VIEW_MODES = [
  { value: 'trends', label: 'Trends' },
  { value: 'targets', label: 'Closure Targets' },
] as const

export function StatsDetailPageContent() {
  const [mode, setMode] = useState<OverviewStatsMode>('trends')
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

  const { queue } = useQueueById(scope.queueId ?? null)
  const scopeTitle =
    scope.queueId != null
      ? scope.queueId === -1
        ? 'Unqueued reports'
        : queue
          ? `${queue.name} Queue`
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

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden text-gray-900 dark:text-gray-100">
      <div className="flex shrink-0 flex-col justify-between gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-start lg:px-8">
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
          <div
            role="radiogroup"
            aria-label="Analytics view"
            className="flex rounded-full bg-gray-100 p-1 dark:bg-slate-800"
          >
            {VIEW_MODES.map(({ value, label }) => (
              <label key={value} className="cursor-pointer">
                <input
                  type="radio"
                  name="stats-view"
                  value={value}
                  checked={mode === value}
                  onChange={() => setMode(value)}
                  className="peer sr-only"
                />
                <span className="block whitespace-nowrap rounded-full px-3 py-1.5 text-sm text-gray-600 transition-colors hover:text-gray-900 peer-checked:bg-white peer-checked:font-semibold peer-checked:text-gray-900 peer-checked:shadow-sm peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-blue-500 dark:text-gray-400 dark:hover:text-gray-100 dark:peer-checked:bg-slate-600 dark:peer-checked:text-gray-100">
                  {label}
                </span>
              </label>
            ))}
          </div>
          <StatsWindowPicker
            value={filters.dateRange}
            onChange={(dateRange) =>
              handleFilterChange({ ...filters, dateRange })
            }
          />
        </div>
      </div>
      <div
        role="region"
        aria-label="Analytics details"
        tabIndex={0}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4 sm:px-6 lg:px-8 [&:focus:not(:focus-visible)]:outline-none"
      >
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
              showPending={!scope.moderatorDid}
              mode={mode}
            />
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
          aria-label={mode === 'trends' ? 'Daily trends' : 'Closure targets'}
        >
          <h2 className="mb-3 font-medium">
            {mode === 'trends' ? 'Daily trends' : 'Closure Targets'}
          </h2>
          <HistoricalGraph
            view={mode}
            showPending={!scope.moderatorDid}
            stats={data?.stats}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => refetch()}
          />
        </section>
      </div>
    </div>
  )
}
