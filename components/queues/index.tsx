import { useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ToolsOzoneQueueDefs } from '@atproto/api'
import { usePermission } from '@/shell/ConfigurationContext'
import { ActionButton } from '@/common/buttons'
import { Select } from '@/common/forms'
import { PlusIcon } from '@heroicons/react/24/solid'
import { useQueueList } from './useQueues'
import { QueueList } from './QueueList'
import { QueueForm } from './QueueForm'
import { QueueDeleteDialog } from './QueueDeleteDialog'

export function QueuesConfig() {
  const canManageQueues = usePermission('canManageQueues')
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const [enabledFilter, setEnabledFilter] = useState<boolean | undefined>(
    undefined,
  )
  const { data, isLoading, isError, refetch } = useQueueList(
    enabledFilter !== undefined ? { enabled: enabledFilter } : undefined,
  )
  const queues = data?.queues ?? []

  const showCreateForm = searchParams.has('create')
  const editingQueueId = searchParams.get('edit')
  const editingQueue = editingQueueId
    ? queues.find((q) => q.id === Number(editingQueueId))
    : undefined

  const [deletingQueue, setDeletingQueue] =
    useState<ToolsOzoneQueueDefs.QueueView | null>(null)

  const navigateTo = (params: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(params)) {
      if (value === null) {
        newParams.delete(key)
      } else {
        newParams.set(key, value)
      }
    }
    router.push((pathname ?? '') + '?' + newParams.toString())
  }

  if (!canManageQueues) {
    return (
      <div className="pt-4">
        <p className="text-gray-500 dark:text-gray-400">
          You do not have permission to manage queues.
        </p>
      </div>
    )
  }

  const showEditor = showCreateForm || editingQueueId

  return (
    <div className="pt-4">
      <div className="flex flex-row justify-between mb-4">
        <div className="flex flex-row items-center gap-2">
          <h4 className="font-medium text-gray-700 dark:text-gray-100">
            Manage Queues
          </h4>
          {!showEditor && (
            <Select
              className="text-xs"
              value={
                enabledFilter === undefined
                  ? 'all'
                  : enabledFilter
                    ? 'enabled'
                    : 'disabled'
              }
              onChange={(e) => {
                const val = e.target.value
                setEnabledFilter(
                  val === 'all' ? undefined : val === 'enabled',
                )
              }}
            >
              <option value="all">All</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </Select>
          )}
        </div>
        {!showEditor && (
          <ActionButton
            size="sm"
            appearance="primary"
            data-cy="add-queue-button"
            onClick={() => navigateTo({ create: 'true' })}
          >
            <PlusIcon className="h-3 w-3 mr-1" />
            <span className="text-xs">Add Queue</span>
          </ActionButton>
        )}
      </div>

      {showCreateForm && (
        <div className="mb-4">
          <QueueForm
            onCancel={() => navigateTo({ create: null })}
            onSuccess={() => navigateTo({ create: null })}
          />
        </div>
      )}

      {editingQueueId && !showCreateForm && (
        <div className="mb-4">
          {editingQueue ? (
            <QueueForm
              queue={editingQueue}
              onCancel={() => navigateTo({ edit: null })}
              onSuccess={() => navigateTo({ edit: null })}
            />
          ) : (
            <p className="text-red-500 text-sm">
              Queue not found.{' '}
              <button
                className="underline"
                onClick={() => navigateTo({ edit: null })}
              >
                Back to list
              </button>
            </p>
          )}
        </div>
      )}

      {isError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded text-red-700 dark:text-red-300 text-sm">
          Failed to load queues.{' '}
          <button className="underline" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      )}

      {!showEditor && (
        <QueueList
          queues={queues}
          isLoading={isLoading}
          onEdit={(queue) => navigateTo({ edit: String(queue.id) })}
          onDelete={(queue) => setDeletingQueue(queue)}
        />
      )}

      <QueueDeleteDialog
        queue={deletingQueue}
        queues={queues}
        onClose={() => setDeletingQueue(null)}
      />
    </div>
  )
}
