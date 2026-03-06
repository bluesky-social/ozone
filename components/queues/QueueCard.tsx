import { QueueAssigneeStatus } from '@/assignments/QueueAssigneeStatus'
import { useQueueAssignments } from '@/assignments/useAssignments'
import { Card } from '@/common/Card'
import { UserBadge } from '@/common/profileStatus/UserBadge'
import { ReasonBadge } from '@/reports/ReasonBadge'
import { ToolsOzoneQueueDefs } from '@atproto/api'
import { ReactNode } from 'react'

export function QueueCard({
  queue,
  actions,
}: {
  queue: ToolsOzoneQueueDefs.QueueView
  actions?: ReactNode
}) {
  const { data: assignments } = useQueueAssignments({
    onlyActive: true,
    queueIds: [queue.id],
  })
  const queueAssignments =
    assignments?.filter((a) => a.queue.id === queue.id) ?? []

  return (
    <Card data-cy="queue-card" className="p-4 space-y-2">
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 truncate">
            {queue.name}
          </h3>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              queue.enabled
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {queue.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        {actions && <div className="flex gap-1 ml-2">{actions}</div>}
      </div>

      {queue.description && (
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-2">
          {queue.description}
        </p>
      )}

      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300 mb-3">
        <div>
          <span className="font-medium">Subject types:</span>{' '}
          {queue.subjectTypes.map((type) => (
            <span
              key={type}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200 mr-1"
            >
              {type}
            </span>
          ))}
        </div>

        {queue.collection && (
          <div>
            <span className="font-medium">Collection:</span>{' '}
            <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">
              {queue.collection}
            </code>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1">
          <span className="font-medium">Report types:</span>
          {queue.reportTypes.map((type) => (
            <ReasonBadge key={type} reasonType={type} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span>
          Pending: <strong>{queue.stats.pendingCount}</strong>
        </span>
        <span>
          Actioned: <strong>{queue.stats.actionedCount}</strong>
        </span>
        <span>
          Escalated: <strong>{queue.stats.escalatedPendingCount}</strong>
        </span>
      </div>

      <div data-cy="queue-assignees">
        <QueueAssigneeStatus
          queueId={queue.id}
          assignments={queueAssignments}
        />
      </div>
    </Card>
  )
}
