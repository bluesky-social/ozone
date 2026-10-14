import { useQueueList } from '@/queues/useQueues'

export function QueueAging() {
  const {
    data,
    isLoading,
    isError,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useQueueList(undefined, { refetchInterval: 5 * 60 * 1000 })
  const queues = data?.pages.flatMap((page) => page.queues) ?? []
  const maxPending = Math.max(
    1,
    ...queues.map((queue) => queue.stats.pendingCount ?? 0),
  )

  return (
    <section
      aria-label="Aging against closure target"
      data-cy="queue-aging"
      className="mb-6 rounded-xl border border-gray-200 bg-white p-4 text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Aging against closure target</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Current pending reports by queue
          </p>
        </div>
        <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-300">
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-sm bg-rose-500 dark:bg-rose-400"
            />
            Past target
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-sm bg-blue-300 dark:bg-blue-400"
            />
            Other pending
          </span>
        </div>
      </div>
      {isLoading ? (
        <p
          role="status"
          className="py-8 text-center text-sm text-gray-500 dark:text-gray-400"
        >
          Loading queues...
        </p>
      ) : isError ? (
        <p
          role="alert"
          className="py-8 text-center text-sm text-red-600 dark:text-red-400"
        >
          Failed to load queues.{' '}
          <button type="button" onClick={() => refetch()} className="underline">
            Retry
          </button>
        </p>
      ) : !queues.length ? (
        <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          No queues available.
        </p>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-gray-100 dark:divide-slate-700">
            {queues.map((queue) => {
              const pending = queue.stats.pendingCount
              const overdue = queue.stats.closureTargetOverdueCount
              const hasBreakdown =
                pending != null &&
                overdue != null &&
                pending >= 0 &&
                overdue >= 0 &&
                overdue <= pending
              return (
                <li
                  key={queue.id}
                  className="grid gap-x-4 gap-y-2 py-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_10rem] sm:items-center"
                >
                  <h3 className="break-words text-sm font-medium">
                    {queue.name}
                  </h3>
                  <div className="order-last sm:order-none">
                    {hasBreakdown ? (
                      <div
                        role="img"
                        aria-label={`${overdue.toLocaleString()} past target; ${(pending - overdue).toLocaleString()} other pending`}
                        className="h-4"
                      >
                        <div
                          className="flex h-full overflow-hidden rounded"
                          style={{ width: `${(pending / maxPending) * 100}%` }}
                        >
                          <div
                            className="h-full bg-rose-500 dark:bg-rose-400"
                            style={{
                              width: `${pending ? (overdue / pending) * 100 : 0}%`,
                            }}
                          />
                          <div className="h-full flex-1 bg-blue-300 dark:bg-blue-400" />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Target breakdown unavailable.
                      </p>
                    )}
                  </div>
                  <div className="flex justify-between gap-3 text-xs tabular-nums sm:block sm:text-right">
                    <p
                      className={
                        overdue
                          ? 'font-semibold text-rose-600 dark:text-rose-400'
                          : 'text-gray-600 dark:text-gray-300'
                      }
                      data-cy="queue-overdue"
                    >
                      {overdue?.toLocaleString() ?? '—'} past target
                    </p>
                    <p
                      className="text-gray-500 dark:text-gray-400 sm:mt-1"
                      data-cy="queue-pending"
                    >
                      {pending?.toLocaleString() ?? '—'} pending
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
          {hasNextPage && (
            <div className="mt-3 text-center">
              <button
                type="button"
                disabled={isFetchingNextPage}
                onClick={() => fetchNextPage()}
                className="text-sm text-blue-600 hover:underline disabled:opacity-50 dark:text-blue-400"
              >
                {isFetchingNextPage ? 'Loading...' : 'Load more queues'}
              </button>
            </div>
          )}
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Other pending includes reports without a closure target. Counts
            exclude muted reports and are independent of the selected date
            range.
          </p>
        </>
      )}
    </section>
  )
}
