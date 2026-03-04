import { useState } from 'react'
import { ToolsOzoneQueueDefs } from '@atproto/api'
import { usePermission } from '@/shell/ConfigurationContext'
import { ActionButton } from '@/common/buttons'
import { Select } from '@/common/forms'
import { PlusIcon } from '@heroicons/react/24/solid'
import { useQueueList } from './useQueues'
import { QueueList } from './QueueList'
import { QueueForm } from './QueueForm'
import { QueueDeleteDialog } from './QueueDeleteDialog'

type PageState =
  | { mode: 'list' }
  | { mode: 'create' }
  | { mode: 'edit'; queueId: number }
  | { mode: 'delete'; queueId: number }

export function QueuesConfig() {
  const canManageQueues = usePermission('canManageQueues')

  // filters
  const [enabledFilter, setEnabledFilter] = useState<boolean | undefined>(
    undefined,
  )

  // data
  const { data, isLoading, isError, refetch } = useQueueList(
    enabledFilter !== undefined ? { enabled: enabledFilter } : undefined,
  )
  const queues = data?.queues ?? []

  // page state
  const [pageState, setPageState] = useState<PageState>({ mode: 'list' })
  const showForm = pageState.mode === 'edit' || pageState.mode === 'create'
  const slectedQueue =
    pageState.mode === 'edit' || pageState.mode === 'delete'
      ? queues.find((q) => q.id === pageState.queueId)
      : undefined

  return (
    <div className="pt-4">
      <div className="flex flex-row justify-between mb-4">
        <div className="flex flex-row items-center gap-2">
          <h4 className="font-medium text-gray-700 dark:text-gray-100">
            Manage Queues
          </h4>
          {!showForm && (
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
                setEnabledFilter(val === 'all' ? undefined : val === 'enabled')
              }}
            >
              <option value="all">All</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </Select>
          )}
        </div>
        {canManageQueues && !showForm && (
          <ActionButton
            size="sm"
            appearance="primary"
            data-cy="add-queue-button"
            onClick={() => setPageState({ mode: 'create' })}
          >
            <PlusIcon className="h-3 w-3 mr-1" />
            <span className="text-xs">Add Queue</span>
          </ActionButton>
        )}
      </div>

      {canManageQueues && pageState.mode === 'create' && (
        <div className="mb-4">
          <QueueForm
            onCancel={() => setPageState({ mode: 'list' })}
            onSuccess={() => setPageState({ mode: 'list' })}
          />
        </div>
      )}

      {canManageQueues && pageState.mode === 'edit' && (
        <div className="mb-4">
          {slectedQueue ? (
            <QueueForm
              queue={pageState.mode === 'edit' ? slectedQueue : undefined}
              onCancel={() => setPageState({ mode: 'list' })}
              onSuccess={() => setPageState({ mode: 'list' })}
            />
          ) : (
            <p className="text-red-500 text-sm">
              Queue not found.{' '}
              <button
                className="underline"
                onClick={() => setPageState({ mode: 'list' })}
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

      {!showForm && (
        <QueueList
          queues={queues}
          isLoading={isLoading}
          onEdit={(queue) => setPageState({ mode: 'edit', queueId: queue.id })}
          onDelete={(queue) =>
            setPageState({ mode: 'delete', queueId: queue.id })
          }
        />
      )}

      <QueueDeleteDialog
        queue={pageState.mode === 'delete' ? slectedQueue : undefined}
        queues={queues}
        onClose={() => setPageState({ mode: 'list' })}
      />
    </div>
  )
}
