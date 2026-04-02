'use client'
import {
  DateRangePreset,
  computeDatesForPreset,
  getDefaultDateRange,
} from '@/common/DateRangeFilter'
import { HistoricalGraph } from '@/reports/stats/HistoricalGraph'
import { LiveStatsPanel } from '@/reports/stats/LiveStatsPanel'
import { categoryToReportTypes } from '@/reports/ReportCategorySelect'
import { REPORT_CATEGORIES } from '@/reports/stats'
import { StatsFilters, StatsFilterState } from '@/reports/stats/StatsFilters'
import {
  LiveStatsParams,
  useHistoricalStats,
} from '@/reports/stats/useMockReportStats'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTitle } from 'react-use'

function parseFiltersFromParams(
  searchParams: URLSearchParams,
): StatsFilterState {
  const reportTypesParam = searchParams.get('reportTypes')
  const categoryParam = searchParams.get('category')
  const queueIdParam = searchParams.get('queueId')
  const startDateParam = searchParams.get('startDate')
  const endDateParam = searchParams.get('endDate')

  const category = categoryParam || undefined

  let reportTypes: string[] = []
  if (reportTypesParam) {
    const group = REPORT_CATEGORIES.find((g) => g.key === reportTypesParam)
    const resolved = group?.reportTypes
    if (resolved) {
      reportTypes = resolved
    } else {
      reportTypes = reportTypesParam.split(',').filter(Boolean)
    }
  }

  const presetParam = searchParams.get('preset')
  const validPresets: DateRangePreset[] = ['7d', '30d', '90d', 'custom']
  const preset =
    presetParam && validPresets.includes(presetParam as DateRangePreset)
      ? (presetParam as DateRangePreset)
      : startDateParam || endDateParam
        ? 'custom'
        : undefined

  const dateRange = preset
    ? { ...computeDatesForPreset(preset), preset }
    : getDefaultDateRange()
  if (startDateParam) dateRange.startDate = startDateParam
  if (endDateParam) dateRange.endDate = endDateParam

  return {
    queueId: queueIdParam ? Number(queueIdParam) : undefined,
    category,
    reportTypes,
    dateRange,
  }
}

function filtersToParams(filters: StatsFilterState): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.category) {
    params.set('category', filters.category)
  }
  if (filters.reportTypes.length > 0) {
    params.set('reportTypes', filters.reportTypes.join(','))
  }
  if (filters.queueId != null) {
    params.set('queueId', String(filters.queueId))
  }
  params.set('preset', filters.dateRange.preset)
  if (filters.dateRange.startDate && filters.dateRange.preset === 'custom') {
    params.set('startDate', filters.dateRange.startDate)
  }
  if (filters.dateRange.endDate && filters.dateRange.preset === 'custom') {
    params.set('endDate', filters.dateRange.endDate)
  }

  return params
}

export function StatsDetailPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const initialFilters = useMemo(() => parseFiltersFromParams(searchParams), [searchParams])

  const [filters, setFilters] = useState<StatsFilterState>(initialFilters)
  const categoryTitle = filters.category
    ? REPORT_CATEGORIES.find((c) => c.key === filters.category)?.title
    : undefined
  const pageTitle = categoryTitle ? `Analytics: ${categoryTitle}` : 'Analytics'
  useTitle(pageTitle)

  const handleFilterChange = useCallback(
    (newFilters: StatsFilterState) => {
      setFilters(newFilters)
      const params = filtersToParams(newFilters)
      const qs = params.toString()
      router.push(`/analytics/stats${qs ? `?${qs}` : ''}`, { scroll: false })
    },
    [router],
  )

  // Sync URL changes back to filter state (e.g. browser back/forward)
  useEffect(() => {
    const newFilters = parseFiltersFromParams(searchParams)
    setFilters(newFilters)
  }, [searchParams])

  const allReportTypes = [
    ...categoryToReportTypes(filters.category),
    ...filters.reportTypes,
  ]

  const liveParams: LiveStatsParams = {
    reportTypes: allReportTypes.length > 0 ? allReportTypes : undefined,
    queueId: filters.queueId,
  }

  const historicalParams = {
    ...liveParams,
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
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {pageTitle}
      </h1>

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
