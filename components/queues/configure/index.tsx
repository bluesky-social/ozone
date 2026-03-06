import { ActionButton } from '@/common/buttons'
import { Input, Select } from '@/common/forms'
import { ReportTypeMultiselect } from '@/reports/ReportTypeMultiselect'
import { usePermission } from '@/shell/ConfigurationContext'
import { PlusIcon } from '@heroicons/react/24/solid'
import { useState } from 'react'
import { useDebounce } from 'react-use'
import { QueueListFilters, useQueueList } from '../useQueues'
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
  const updateFilter = <K extends keyof QueueListFilters>(
    key: K,
    value: QueueListFilters[K],
  ) => setFilters((prev) => ({ ...prev, [key]: value }))
  /// debounced collection field
  const [collectionInput, setCollectionInput] = useState<string | undefined>()
  useDebounce(
    () => updateFilter('collection', collectionInput || undefined),
    300,
    [collectionInput],
  )
  const resetFilters = () => {
    setFilters({})
    setCollectionInput(undefined)
  }

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
      <div className="flex flex-wrap items-center gap-2 mb-4">
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
                updateFilter('subjectType', val === 'all' ? undefined : val)
              }}
            >
              <option value="all">All subjects</option>
              <option value="account">account</option>
              <option value="record">record</option>
              <option value="message">message</option>
            </Select>
            <Input
              type="text"
              className="min-w-[10rem] flex-1 text-sm"
              placeholder="collection (e.g. app.bsky.feed.post)"
              value={collectionInput}
              onChange={(e) => setCollectionInput(e.target.value)}
            />
          </>
        )}
        {canManageQueues && !showForm && (
          <ActionButton
            size="md"
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
        <div className="mb-4 flex items-center gap-2">
          <div className="flex-1">
            <ReportTypeMultiselect
              value={filters.reportTypes ?? []}
              onChange={(val) => updateFilter('reportTypes', val)}
            />
          </div>
          <ActionButton
            type="button"
            size="md"
            appearance="outlined"
            onClick={() => resetFilters()}
          >
            <p className="text-xs">Reset Filters</p>
          </ActionButton>
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
