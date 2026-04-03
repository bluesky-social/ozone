import { useQueueList } from '@/queues/useQueues'
import { ReportCategorySelect } from '@/reports/ReportCategorySelect'
import { MemberSingleSelect } from '@/team/MemberSingleSelect'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  computeDatesForPreset,
  DateRangeFilter,
  DateRangePreset,
  DateRangeValue,
} from '../../common/DateRangeFilter'

export type Grouping = 'queue' | 'category' | 'moderator'

export type StatsFilterState = {
  grouping: Grouping
  queueId?: number
  category?: string
  moderatorDid?: string
  dateRange: DateRangeValue
}

function filtersFromParams(searchParams: URLSearchParams): StatsFilterState {
  const groupingParam = searchParams.get('grouping')
  const categoryParam = searchParams.get('category')
  const moderatorDidParam = searchParams.get('moderatorDid')
  const queueIdParam = searchParams.get('queueId')
  const startDateParam = searchParams.get('startDate')
  const endDateParam = searchParams.get('endDate')
  const presetParam = searchParams.get('preset')

  const preset = ['7d', '30d', '90d', 'custom'].includes(presetParam!)
    ? (presetParam as DateRangePreset)
    : startDateParam || endDateParam
      ? 'custom'
      : '30d'

  const dates = computeDatesForPreset(preset)
  const dateRange = {
    startDate: dates.startDate,
    endDate: dates.endDate,
    preset,
  }
  if (startDateParam) dateRange.startDate = startDateParam
  if (endDateParam) dateRange.endDate = endDateParam

  const validGroupings: Grouping[] = ['queue', 'category', 'moderator']
  const grouping: Grouping =
    groupingParam && validGroupings.includes(groupingParam as Grouping)
      ? (groupingParam as Grouping)
      : categoryParam
        ? 'category'
        : moderatorDidParam
          ? 'moderator'
          : 'queue'

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
  params.set('preset', filters.dateRange.preset)
  if (filters.dateRange.startDate && filters.dateRange.preset === 'custom') {
    params.set('startDate', filters.dateRange.startDate)
  }
  if (filters.dateRange.endDate && filters.dateRange.preset === 'custom') {
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

const GROUPINGS: { key: Grouping; label: string }[] = [
  { key: 'queue', label: 'By Queue' },
  { key: 'category', label: 'By Category' },
  { key: 'moderator', label: 'By Moderator' },
]

export function StatsFilters({
  value,
  onChange,
}: {
  value: StatsFilterState
  onChange: (value: StatsFilterState) => void
}) {
  const { data: queuesData } = useQueueList({ limit: 100 })
  const queues = queuesData?.pages.flatMap((page) => page.queues ?? []) ?? []

  const handleGroupingChange = (grouping: Grouping) => {
    onChange({
      grouping,
      queueId: undefined,
      category: undefined,
      moderatorDid: undefined,
      dateRange: value.dateRange,
    })
  }

  return (
    <div className="mb-4 flex flex-wrap items-start gap-3">
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Grouping
        </label>
        <select
          value={value.grouping}
          onChange={(e) => handleGroupingChange(e.target.value as Grouping)}
          className="block w-auto text-sm rounded border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-200"
        >
          {GROUPINGS.map((mode) => (
            <option key={mode.key} value={mode.key}>
              {mode.label}
            </option>
          ))}
        </select>
      </div>

      {value.grouping === 'queue' && (
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Queue
          </label>
          <select
            value={value.queueId ?? ''}
            onChange={(e) =>
              onChange({
                ...value,
                queueId: e.target.value ? Number(e.target.value) : undefined,
                category: undefined,
                moderatorDid: undefined,
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
      )}

      {value.grouping === 'category' && (
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Category
          </label>
          <ReportCategorySelect
            value={value.category}
            onChange={(category) =>
              onChange({
                ...value,
                category,
                queueId: undefined,
                moderatorDid: undefined,
              })
            }
          />
        </div>
      )}

      {value.grouping === 'moderator' && (
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Moderator
          </label>
          <MemberSingleSelect
            className="py-[8px] w-56"
            value={value.moderatorDid}
            onChange={(moderatorDid) =>
              onChange({
                ...value,
                moderatorDid,
                queueId: undefined,
                category: undefined,
              })
            }
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
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
