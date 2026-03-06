import { ToolsOzoneQueueDefs } from '@atproto/api'
import { Card } from '@/common/Card'
import { ReasonBadge } from '@/reports/ReasonBadge'
import { ReactNode } from 'react'
import { useQueueAssignments } from '@/assignments/useAssignments'
import { QueueAssigneeStatus } from '@/assignments/QueueAssigneeStatus'
import { UserBadge } from '@/common/profileStatus/UserBadge'

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
    <Card data-cy="queue-card" className="relative px-4 py-3">
      <div
        className={`grid ${actions ? 'grid-cols-[1fr_1fr_1fr_auto]' : 'grid-cols-3'} gap-x-4 items-start text-sm`}
      >
        {/* Left column */}
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {queue.name}
            </h3>
            <span
              className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                queue.enabled
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {queue.enabled ? 'Enabled' : 'Disabled'}
            </span>
            {queue.collection && (
              <code className="shrink-0 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                {queue.collection}
              </code>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Subject Types
            </p>
            <div className="flex items-center gap-1">
              {queue.subjectTypes.map((type) => (
                <span
                  key={type}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                >
                  {type}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Report Types
            </p>
            <div className="flex flex-wrap items-center gap-1">
              {queue.reportTypes.map((type) => (
                <ReasonBadge key={type} reasonType={type} />
              ))}
            </div>
          </div>
        </div>

        {/* Center column */}
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400 dark:text-gray-500">Stats</p>
          <div className="flex flex-col text-xs text-gray-500 dark:text-gray-400">
            <span>
              <strong>{queue.stats.pendingCount}</strong> pending
            </span>
            <span>
              <strong>{queue.stats.actionedCount}</strong> actioned
            </span>
            <span>
              <strong>{queue.stats.escalatedPendingCount}</strong> escalated
            </span>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-2">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
              Created By
            </p>
            <UserBadge did={queue.createdBy} />
          </div>
          <div className="w-fit flex flex-col gap-1">
            <p className="text-xs text-gray-400 dark:text-gray-500">Assigned</p>
            <div data-cy="queue-assignees">
              <QueueAssigneeStatus
                queueId={queue.id}
                assignments={queueAssignments}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        {actions && <div className="w-fit">{actions}</div>}
      </div>
    </Card>
  )
}
