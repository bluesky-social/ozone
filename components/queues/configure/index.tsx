import { ActionButton } from '@/common/buttons'
import { usePermission } from '@/shell/ConfigurationContext'
import { PlusIcon } from '@heroicons/react/24/solid'
import { useState } from 'react'
import { QueueListFilters, useQueueList } from '../useQueues'
import { QueueFilters } from '../QueueFilters'
import { QueueDeleteDialog } from './QueueDeleteDialog'
import { QueueForm } from './QueueForm'
import { QueueConfigureList } from './QueueConfigureList'

type PageState =
  | { mode: 'list' }
  | { mode: 'create' }
  | { mode: 'edit'; queueId: number }
  | { mode: 'delete'; queueId: number }

export function QueuesConfig() {
  const canManageQueues = usePermission('canManageQueues')

  // filters
  const [filters, setFilters] = useState<QueueListFilters>({})

  // data
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage } =
    useQueueList(filters)
  const queues = data?.pages.flatMap((page) => page.queues) ?? []

  // page state
  const [pageState, setPageState] = useState<PageState>({ mode: 'list' })
  const showForm = pageState.mode === 'edit' || pageState.mode === 'create'
  const selectedQueue =
    pageState.mode === 'edit' || pageState.mode === 'delete'
      ? queues.find((q) => q.id === pageState.queueId)
      : undefined

  return (
    <div className="pt-4">
      {/* filters */}
      {!showForm && (
        <QueueFilters filters={filters} onChange={setFilters}>
          {canManageQueues && (
            <ActionButton
              size="md"
              appearance="primary"
              data-cy="add-queue-button"
              onClick={() => setPageState({ mode: 'create' })}
              className="h-fit"
            >
              <PlusIcon className="h-3 w-3 mr-1" />
              <span className="text-xs">Add Queue</span>
            </ActionButton>
          )}
        </QueueFilters>
      )}

      {/* form */}
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
          {selectedQueue ? (
            <QueueForm
              queue={selectedQueue}
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

      {/* list */}
      {!showForm && (
        <QueueConfigureList
          queues={queues}
          isLoading={isLoading}
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          onEdit={(queue) => setPageState({ mode: 'edit', queueId: queue.id })}
          onDelete={(queue) =>
            setPageState({ mode: 'delete', queueId: queue.id })
          }
        />
      )}
      {isError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded text-red-700 dark:text-red-300 text-sm">
          Failed to load queues.{' '}
          <button className="underline" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      )}

      {/* dialogs */}
      {pageState.mode === 'delete' && (
        <QueueDeleteDialog
          queue={selectedQueue}
          queues={queues}
          onClose={() => setPageState({ mode: 'list' })}
        />
      )}
    </div>
  )
}
