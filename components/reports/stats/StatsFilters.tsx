import { useQueueList } from '@/queues/useQueues'
import { ReportCategorySelect } from '@/reports/ReportCategorySelect'
import { DateRangeFilter, DateRangeValue } from '../../common/DateRangeFilter'

export type StatsFilterState = {
  queueId?: number
  category?: string
  reportTypes: string[]
  dateRange: DateRangeValue
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
          onChange={(category) => onChange({ ...value, category })}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Date Range
        </label>
        <DateRangeFilter
          value={value.dateRange}
          onChange={(dateRange) => onChange({ ...value, dateRange })}
        />
      </div>
    </div>
  )
}
