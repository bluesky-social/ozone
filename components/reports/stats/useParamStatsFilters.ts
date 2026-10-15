import { subDays } from 'date-fns'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DETAIL_STATS_PERIODS,
  DetailStatsDateRange,
  getDetailStatsWindow,
  matchingDetailStatsPeriod,
} from './detailStatsWindow'

const LEGACY_PRESET_DAYS = new Map([
  ['7d', 7],
  ['30d', 30],
  ['90d', 90],
])

export type Grouping = 'aggregate' | 'queue' | 'category' | 'moderator'

export type StatsFilterState = {
  grouping: Grouping
  queueId?: number
  category?: string
  moderatorDid?: string
  dateRange: DetailStatsDateRange
}

function filtersFromParams(searchParams: URLSearchParams): StatsFilterState {
  const groupingParam = searchParams.get('grouping')
  const categoryParam = searchParams.get('category')
  const moderatorDidParam = searchParams.get('moderatorDid')
  const queueIdParam = searchParams.get('queueId')
  const startDateParam = searchParams.get('startDate')
  const endDateParam = searchParams.get('endDate')
  const presetParam = searchParams.get('preset')

  const today = new Date().toISOString().slice(0, 10)
  const periodParam = DETAIL_STATS_PERIODS.find(
    (period) => period === searchParams.get('period'),
  )
  const legacyDays = LEGACY_PRESET_DAYS.get(presetParam ?? '')
  // Keep old preset links working, then persist their resolved dates in the URL.
  const dateRange: DetailStatsDateRange = legacyDays
    ? {
        startDate: subDays(new Date(), legacyDays).toISOString(),
        endDate: new Date().toISOString(),
      }
    : startDateParam || endDateParam || presetParam === 'custom'
      ? {}
      : getDetailStatsWindow(periodParam ?? 'week', today, today)
  if (startDateParam) dateRange.startDate = startDateParam
  if (endDateParam) dateRange.endDate = endDateParam
  dateRange.period = matchingDetailStatsPeriod(
    dateRange,
    today,
    periodParam ?? dateRange.period,
  )

  const validGroupings: Grouping[] = [
    'aggregate',
    'queue',
    'category',
    'moderator',
  ]
  const grouping: Grouping =
    groupingParam && validGroupings.includes(groupingParam as Grouping)
      ? (groupingParam as Grouping)
      : categoryParam
        ? 'category'
        : moderatorDidParam
          ? 'moderator'
          : queueIdParam
            ? 'queue'
            : 'aggregate'

  return {
    grouping,
    queueId: queueIdParam ? Number(queueIdParam) : undefined,
    category: categoryParam ?? undefined,
    moderatorDid: moderatorDidParam || undefined,
    dateRange,
  }
}

function filtersToParams(filters: StatsFilterState): URLSearchParams {
  const params = new URLSearchParams()

  params.set('grouping', filters.grouping)
  if (filters.category) {
    params.set('category', filters.category)
  }
  if (filters.queueId != null) {
    params.set('queueId', String(filters.queueId))
  }
  if (filters.moderatorDid) {
    params.set('moderatorDid', filters.moderatorDid)
  }
  // Persist actual dates so links, reloads, and browser navigation keep the window.
  params.set('preset', 'custom')
  if (filters.dateRange.period) params.set('period', filters.dateRange.period)
  if (filters.dateRange.startDate) {
    params.set('startDate', filters.dateRange.startDate)
  }
  if (filters.dateRange.endDate) {
    params.set('endDate', filters.dateRange.endDate)
  }

  return params
}

export const useParamStatsFilters = () => {
  const searchParams = useSearchParams()
  const router = useRouter()

  const initialFilters = useMemo(
    () => filtersFromParams(searchParams),
    [searchParams],
  )
  const [filters, setFilters] = useState<StatsFilterState>(initialFilters)

  const handleFilterChange = useCallback(
    (newFilters: StatsFilterState) => {
      setFilters(newFilters)
      const params = filtersToParams(newFilters)
      const qs = params.toString()
      router.push(`/analytics/detail${qs ? `?${qs}` : ''}`, { scroll: false })
    },
    [router],
  )

  // Populate URL with default filters on initial load
  useEffect(() => {
    const params = filtersToParams(initialFilters)
    const qs = params.toString()
    const currentQs = searchParams.toString()
    if (qs !== currentQs) {
      router.replace(`/analytics/detail${qs ? `?${qs}` : ''}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync URL changes (e.g. browser back/forward)
  useEffect(() => {
    const newFilters = filtersFromParams(searchParams)
    setFilters(newFilters)
  }, [searchParams])

  return { filters, handleFilterChange }
}
