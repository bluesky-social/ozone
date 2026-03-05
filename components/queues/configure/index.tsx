import { useState } from 'react'
import { usePermission } from '@/shell/ConfigurationContext'
import { ActionButton } from '@/common/buttons'
import { Input, Select } from '@/common/forms'
import { PlusIcon } from '@heroicons/react/24/solid'
import { useQueueList, QueueListFilters } from '../useQueues'
import { ReportTypeMultiselect } from '@/reports/ReportTypeMultiselect'
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
  const [filters, setFilters] = useState<QueueListFilters>({})
  const updateFilter = <K extends keyof QueueListFilters>(
    key: K,
    value: QueueListFilters[K],
  ) => setFilters((prev) => ({ ...prev, [key]: value }))

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
      <div className="flex flex-row justify-between mb-4">
        <div className="flex flex-row items-center gap-2">
          <h4 className="font-medium text-gray-700 dark:text-gray-100">
            Manage Queues
          </h4>
          {!showForm && (
            <>
              <Select
                className="text-xs"
                value={
                  filters.enabled === undefined
                    ? 'all'
                    : filters.enabled
                      ? 'enabled'
                      : 'disabled'
                }
                onChange={(e) => {
                  const val = e.target.value
                  updateFilter(
                    'enabled',
                    val === 'all' ? undefined : val === 'enabled',
                  )
                }}
              >
                <option value="all">All</option>
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </Select>
              <Select
                className="text-xs"
                value={filters.subjectType ?? 'all'}
                onChange={(e) => {
                  const val = e.target.value
                  updateFilter(
                    'subjectType',
                    val === 'all' ? undefined : val,
                  )
                }}
              >
                <option value="all">All subjects</option>
                <option value="account">account</option>
                <option value="record">record</option>
                <option value="message">message</option>
              </Select>
              <Input
                type="text"
                className="text-xs w-48"
                placeholder="Collection filter"
                value={filters.collection ?? ''}
                onChange={(e) =>
                  updateFilter('collection', e.target.value || undefined)
                }
              />
            </>
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
      {!showForm && (
        <div className="mb-4 max-w-md">
          <ReportTypeMultiselect
            value={filters.reportTypes ?? []}
            onChange={(val) => updateFilter('reportTypes', val)}
          />
        </div>
      )}

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
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          onEdit={(queue) => setPageState({ mode: 'edit', queueId: queue.id })}
          onDelete={(queue) =>
            setPageState({ mode: 'delete', queueId: queue.id })
          }
        />
      )}

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
