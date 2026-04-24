import { ActionButton } from '@/common/buttons'
import { usePermission } from '@/shell/ConfigurationContext'
import { Cog6ToothIcon, PlusIcon } from '@heroicons/react/24/solid'
import { useState } from 'react'
import { QueueListFilters, useQueueList } from '../useQueues'
import { QueueFilters } from '../QueueFilters'
import { QueueList } from '../QueueList'
import { QueueDeleteDialog } from './QueueDeleteDialog'
import { QueueForm } from './QueueForm'
import { QueueManagerDialog } from './QueueManagerDialog'

type PageState =
  | { mode: 'list' }
  | { mode: 'create' }
  | { mode: 'edit'; queueId: number }
  | { mode: 'delete'; queueId: number }
  | { mode: 'manage' }

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
  const showForm = pageState.mode === 'create' || pageState.mode === 'edit'
  const selectedQueue =
    pageState.mode === 'edit' || pageState.mode === 'delete'
      ? queues.find((q) => q.id === pageState.queueId)
      : undefined

  return (
    <div className="pt-4">
      {/* filters */}
      {!showForm && (
        <QueueFilters className="mb-6" filters={filters} onChange={setFilters}>
          {canManageQueues && (
            <div className="flex gap-2">
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
              <ActionButton
                size="md"
                appearance="outlined"
                onClick={() => setPageState({ mode: 'manage' })}
                className="h-fit"
              >
                <Cog6ToothIcon className="h-3 w-3 mr-1" />
                <span className="text-xs">Manage</span>
              </ActionButton>
            </div>
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
        <QueueList
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
      {pageState.mode === 'manage' && (
        <QueueManagerDialog onClose={() => setPageState({ mode: 'list' })} />
      )}
    </div>
  )
}
