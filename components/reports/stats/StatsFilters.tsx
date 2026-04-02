import { useQueueList } from '@/queues/useQueues'
import { ReportCategorySelect } from '@/reports/ReportCategorySelect'
import {
  computeDatesForPreset,
  DateRangeFilter,
  DateRangePreset,
  DateRangeValue,
  getDefaultDateRange,
} from '../../common/DateRangeFilter'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { REPORT_CATEGORIES } from '.'

export type StatsFilterState = {
  queueId?: number
  category?: string
  reportTypes: string[]
  dateRange: DateRangeValue
}

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

export const useStatsFilters = () => {
  const searchParams = useSearchParams()
  const router = useRouter()

  const initialFilters = useMemo(
    () => parseFiltersFromParams(searchParams),
    [searchParams],
  )
  const [filters, setFilters] = useState<StatsFilterState>(initialFilters)

  const handleFilterChange = useCallback(
    (newFilters: StatsFilterState) => {
      setFilters(newFilters)
      const params = filtersToParams(newFilters)
      const qs = params.toString()
      router.push(`/analytics/stats${qs ? `?${qs}` : ''}`, { scroll: false })
    },
    [router],
  )

  // Sync URL changes
  useEffect(() => {
    const newFilters = parseFiltersFromParams(searchParams)
    setFilters(newFilters)
  }, [searchParams])

  return { filters, handleFilterChange }
}

export function StatsFilters({
  value,
  onChange,
}: {
  value: StatsFilterState
  onChange: (value: StatsFilterState) => void
}) {
  const { data: queuesData } = useQueueList()
  const queues = queuesData?.pages.flatMap((page) => page.queues ?? []) ?? []

  return (
    <div className="flex flex-wrap items-start gap-3 mb-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Queue
        </label>
        <select
          value={value.queueId ?? ''}
          onChange={(e) =>
            onChange({
              ...value,
              queueId: e.target.value ? Number(e.target.value) : undefined,
              category: e.target.value ? undefined : value.category,
            })
          }
          className="block w-auto text-sm rounded border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-200"
        >
          <option value="">All Queues</option>
          {queues.map((q) => (
            <option key={q.id} value={q.id}>
              {q.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Category
        </label>
        <ReportCategorySelect
          value={value.category}
          onChange={(category) =>
            onChange({
              ...value,
              category,
              queueId: category ? undefined : value.queueId,
            })
          }
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Date Range
        </label>
        <DateRangeFilter
          value={value.dateRange}
          onChange={(dateRange) => onChange({ ...value, dateRange })}
          limit={100}
        />
      </div>
    </div>
  )
}
