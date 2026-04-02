import { ToolsOzoneQueueDefs } from '@atproto/api'
import { StatValue } from '@/reports/stats/StatValue'

export function QueueStatsCard({
  queue,
  href,
}: {
  queue: ToolsOzoneQueueDefs.QueueView
  href?: string
}) {
  const stats = queue.stats
  return (
    <a
      href={href}
      className="shrink-0 w-64 rounded-lg shadow bg-white dark:bg-slate-800 p-4 dark:shadow-slate-700"
    >
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 truncate">
        {queue.name}
      </h3>
      <div className="flex flex-wrap gap-1.5">
        <StatValue
          label="Pending"
          value={stats.pendingCount}
          className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
        />
        <StatValue
          label="Escalated"
          value={stats.escalatedPendingCount}
          className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
        />
        <StatValue
          label="Inbound"
          value={stats.inboundCount}
          className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
        />
        <StatValue
          label="Actioned"
          value={stats.actionedCount}
          className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
          suffix={
            stats.actionRate != null ? ` (${stats.actionRate}%)` : undefined
          }
        />
      </div>
    </a>
  )
}
