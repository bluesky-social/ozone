'use client'
import { useQueueList } from '@/queues/useQueues'
import { REPORT_CATEGORIES } from '@/reports/stats'
import { StatsCard } from '@/reports/stats/StatsCard'
import { ToolsOzoneQueueDefs } from '@atproto/api'
import { useMemo } from 'react'
import { useTitle } from 'react-use'

export function AnalyticsPageContent() {
  useTitle('Analytics')

  const { data: queuePages } = useQueueList()

  const sortedQueues = useMemo(() => {
    const queues = queuePages?.pages.flatMap((p) => p.queues) as
      | ToolsOzoneQueueDefs.QueueView[]
      | undefined
    if (!queues) return []
    return [...queues].sort(
      (a, b) => (b.stats.pendingCount ?? 0) - (a.stats.pendingCount ?? 0),
    )
  }, [queuePages])

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Analytics
      </h1>

      <div className="mb-6">
        <div className="flex gap-4 overflow-x-auto pb-2">
          <StatsCard
            group={{
              title: 'Aggregate',
            }}
          />
          {sortedQueues.map((queue, i) => (
            <StatsCard
              key={queue.id}
              group={{
                title: queue.name,
                queueId: queue.id,
              }}
            />
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          Categories
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {REPORT_CATEGORIES.map((group) => (
            <StatsCard group={group} />
          ))}
        </div>
      </div>
    </div>
  )
}
