import { LoadMoreButton } from '@/common/LoadMoreButton'
import { useQueueList } from '@/queues/useQueues'
import { StatsTable } from './StatsTable'
import type { StatsWindow } from './statsWindow'

export function QueueStatsTable({ window }: { window: StatsWindow }) {
  const {
    data,
    isLoading,
    isError,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useQueueList()
  const queues = data?.pages.flatMap((page) => page.queues) ?? []
  const status = isLoading ? (
    <p role="status" className="p-5 text-sm text-gray-500 dark:text-gray-400">
      Loading queues...
    </p>
  ) : isError ? (
    <p role="alert" className="p-5 text-sm text-red-600 dark:text-red-400">
      Failed to load queues.{' '}
      <button type="button" onClick={() => refetch()} className="underline">
        Retry
      </button>
    </p>
  ) : !queues.length ? (
    <p className="p-5 text-sm text-gray-500 dark:text-gray-400">
      No queues available.
    </p>
  ) : null

  return (
    <StatsTable
      grouping="queue"
      groups={queues.map((queue) => ({
        title: queue.name,
        description: queue.description,
        queueId: queue.id,
      }))}
      window={window}
      status={status}
      pagination={
        hasNextPage && (
          <div className="flex justify-center border-t border-gray-200 p-4 dark:border-slate-700">
            <LoadMoreButton
              disabled={isFetchingNextPage}
              onClick={() => fetchNextPage()}
            >
              {isFetchingNextPage ? 'Loading...' : 'Load more queues'}
            </LoadMoreButton>
          </div>
        )
      }
    />
  )
}
