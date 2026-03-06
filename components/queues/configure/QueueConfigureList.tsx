import { ActionButton } from '@/common/buttons'
import { Card } from '@/common/Card'
import { Loading } from '@/common/Loader'
import { LoadMoreButton } from '@/common/LoadMoreButton'
import { QueueCard } from '@/queues/QueueCard'
import { usePermission } from '@/shell/ConfigurationContext'
import { ToolsOzoneQueueDefs } from '@atproto/api'
import { PencilIcon, TrashIcon } from '@heroicons/react/24/solid'

export function QueueConfigureList({
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
          <QueueCard
            key={queue.id}
            queue={queue}
            actions={
              canManage ? (
                <>
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
                </>
              ) : undefined
            }
          />
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
