import { useLiveStats } from '@/reports/stats/useReportStats'

export function QueueStats() {
  const { data: stats } = useLiveStats()

  if (!stats || !stats.lastUpdated) return null

  const items = [
    {
      label: 'Inbound',
      value: stats.inboundCount,
      className:
        'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    },
    {
      label: 'Pending',
      value: stats.pendingCount,
      className:
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    },
    {
      label: 'Escalated',
      value: stats.escalatedPendingCount,
      className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    },
    {
      label: 'Actioned',
      value: stats.actionedCount,
      suffix: stats.actionRate != null ? ` (${stats.actionRate}%)` : undefined,
      className:
        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item) => (
        <span
          key={item.label}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${item.className}`}
        >
          <strong>{item.value}</strong>
          {item.label}
          {'suffix' in item && item.suffix}
        </span>
      ))}
      <span className="text-xs text-gray-400 dark:text-gray-500">
        Updated {new Date(stats.lastUpdated).toLocaleTimeString()}
      </span>
    </div>
  )
}
