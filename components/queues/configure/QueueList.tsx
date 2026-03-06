import { ToolsOzoneQueueDefs } from '@atproto/api'
import { Card } from '@/common/Card'
import { ActionButton } from '@/common/buttons'
import { PencilIcon, TrashIcon } from '@heroicons/react/24/solid'
import { Loading } from '@/common/Loader'
import { LoadMoreButton } from '@/common/LoadMoreButton'
import { usePermission } from '@/shell/ConfigurationContext'
import { ReasonBadge } from '@/reports/ReasonBadge'

export function QueueList({
  queues,
  isLoading,
  fetchNextPage,
  hasNextPage,
  onEdit,
  onDelete,
}: {
  queues: ToolsOzoneQueueDefs.QueueView[]
  isLoading: boolean
  fetchNextPage: () => void
  hasNextPage?: boolean
  onEdit: (queue: ToolsOzoneQueueDefs.QueueView) => void
  onDelete: (queue: ToolsOzoneQueueDefs.QueueView) => void
}) {
  const canManage = usePermission('canManageQueues')

  if (isLoading) return <Loading />

  if (!queues.length) {
    return (
      <Card className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">No queues found.</p>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {queues.map((queue) => (
          <Card key={queue.id} data-cy="queue-card" className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
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

                {queue.description && (
                  <p className="text-sm text-gray-400 dark:text-gray-500 mb-2 truncate">
                    {queue.description}
                  </p>
                )}

                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
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

                  <div className="flex gap-4 pt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      Pending: <strong>{queue.stats.pendingCount}</strong>
                    </span>
                    <span>
                      Actioned: <strong>{queue.stats.actionedCount}</strong>
                    </span>
                    <span>
                      Escalated:{' '}
                      <strong>{queue.stats.escalatedPendingCount}</strong>
                    </span>
                  </div>

                  <div className="text-xs text-gray-400 dark:text-gray-500 pt-1">
                    Created by {queue.createdBy} on{' '}
                    {new Date(queue.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {canManage && (
                <div className="flex gap-1 ml-2 flex-shrink-0">
                  <ActionButton
                    size="xs"
                    appearance="outlined"
                    onClick={() => onEdit(queue)}
                    title="Edit queue"
                  >
                    <PencilIcon className="h-3 w-3" />
                  </ActionButton>
                  <ActionButton
                    size="xs"
                    appearance="outlined"
                    onClick={() => onDelete(queue)}
                    title="Delete queue"
                  >
                    <TrashIcon className="h-3 w-3" />
                  </ActionButton>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
      {!!queues.length && hasNextPage && (
        <div className="mt-2 flex justify-center pb-2">
          <LoadMoreButton onClick={fetchNextPage} />
        </div>
      )}
    </>
  )
}
