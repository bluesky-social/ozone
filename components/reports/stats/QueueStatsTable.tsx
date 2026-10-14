import { LoadMoreButton } from '@/common/LoadMoreButton'
import { formatDuration } from '@/lib/util'
import { useQueueList } from '@/queues/useQueues'
import type { ToolsOzoneQueueDefs } from '@atproto/api'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { StatsWindow } from './statsWindow'
import { useStatsWindow } from './useStatsWindow'

const count = (value?: number) => value?.toLocaleString() ?? '—'

function Coverage({ count, days }: { count?: number; days: number }) {
  if (days === 1 || (count ?? 0) >= days) return null
  return (
    <span className="mt-1 block text-[11px] font-normal text-amber-700 dark:text-amber-300">
      {count ?? 0} of {days} days
    </span>
  )
}

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

  return (
    <section
      aria-label="Queue statistics"
      data-cy="queue-stats-table"
      className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-gray-200 px-5 py-4 dark:border-slate-700">
        <h2 className="font-semibold">Queues</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {window.label} (UTC) · Select a row to view details
        </p>
      </div>
      {isLoading ? (
        <p
          role="status"
          className="p-5 text-sm text-gray-500 dark:text-gray-400"
        >
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
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[60rem] text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <tr>
                  <th scope="col" className="px-5 py-3 text-left font-semibold">
                    Queue
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-right font-semibold"
                  >
                    Inbound
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-right font-semibold"
                  >
                    Pending
                  </th>
                  <th scope="col" className="px-3 py-3 text-left font-semibold">
                    Closed · ack / action
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-right font-semibold"
                  >
                    Escalated
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-right font-semibold"
                  >
                    Avg handling
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-3 text-right font-semibold"
                  >
                    Closure Target
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {queues.map((queue) => (
                  <QueueStatsRow key={queue.id} queue={queue} window={window} />
                ))}
              </tbody>
            </table>
          </div>
          {hasNextPage && (
            <div className="flex justify-center border-t border-gray-200 p-4 dark:border-slate-700">
              <LoadMoreButton
                disabled={isFetchingNextPage}
                onClick={() => fetchNextPage()}
              >
                {isFetchingNextPage ? 'Loading...' : 'Load more queues'}
              </LoadMoreButton>
            </div>
          )}
          <p className="border-t border-gray-200 px-5 py-3 text-xs text-gray-500 dark:border-slate-700 dark:text-gray-400">
            Pending and past target are current unmuted snapshots. Closure
            Target is the share of targeted closures that met their target.
          </p>
        </>
      )}
    </section>
  )
}

function QueueStatsRow({
  queue,
  window,
}: {
  queue: ToolsOzoneQueueDefs.QueueView
  window: StatsWindow
}) {
  const router = useRouter()
  const { stats, rows, coverage, isLoading, isError, refetch } = useStatsWindow(
    window,
    { queueId: queue.id },
  )
  const params = new URLSearchParams({
    grouping: 'queue',
    queueId: String(queue.id),
    preset: 'custom',
    startDate: window.startDate,
    endDate: window.endDate,
  })
  const href = `/analytics/detail?${params.toString()}`
  const closedRows = rows.filter((row) => row.closedCount != null)
  // Only split the total when every included day has comparable outcomes.
  const hasBreakdown =
    closedRows.length > 0 &&
    closedRows.every(
      (row) =>
        row.actionedCount != null &&
        row.acknowledgedCount != null &&
        row.actionedCount + row.acknowledgedCount === row.closedCount,
    )
  const actioned = closedRows.reduce(
    (total, row) => total + (row.actionedCount ?? 0),
    0,
  )
  const acknowledged = closedRows.reduce(
    (total, row) => total + (row.acknowledgedCount ?? 0),
    0,
  )
  const targeted =
    stats.closureTargetMetCount != null &&
    stats.closureTargetMissedCount != null
      ? stats.closureTargetMetCount + stats.closureTargetMissedCount
      : undefined
  const targetRate = targeted
    ? Math.round((stats.closureTargetMetCount! / targeted) * 100)
    : undefined

  return (
    <tr
      className="cursor-pointer transition-colors hover:bg-gray-50 focus-within:bg-gray-50 dark:hover:bg-slate-700/50 dark:focus-within:bg-slate-700/50"
      onClick={(event) => {
        if (
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          (event.target as HTMLElement).closest('a, button')
        )
          return
        router.push(href)
      }}
    >
      <th scope="row" className="max-w-xs px-5 py-4 text-left font-normal">
        <Link
          href={href}
          className="break-words font-semibold text-blue-600 hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-blue-400"
        >
          {queue.name}
        </Link>
        {queue.description && (
          <p className="mt-1 line-clamp-2 break-words text-xs text-gray-500 dark:text-gray-400">
            {queue.description}
          </p>
        )}
      </th>
      {isLoading || isError ? (
        <td
          colSpan={6}
          className="px-5 py-4 text-right text-xs text-gray-500 dark:text-gray-400"
        >
          {isLoading ? (
            <span role="status">Loading stats...</span>
          ) : (
            <span role="alert" className="text-red-600 dark:text-red-400">
              Stats unavailable.{' '}
              <button
                type="button"
                onClick={() => refetch()}
                className="underline"
              >
                Retry
              </button>
            </span>
          )}
        </td>
      ) : (
        <>
          <td className="px-3 py-4 text-right tabular-nums">
            <span data-cy="queue-inbound">{count(stats.inboundCount)}</span>
            <Coverage count={coverage.inboundCount} days={window.days} />
          </td>
          <td className="px-3 py-4 text-right tabular-nums">
            <span data-cy="queue-pending">{count(stats.pendingCount)}</span>
            <p
              data-cy="queue-overdue"
              className={`mt-1 whitespace-nowrap text-xs ${stats.closureTargetOverdueCount ? 'font-semibold text-rose-600 dark:text-rose-400' : 'text-gray-500 dark:text-gray-400'}`}
            >
              {count(stats.closureTargetOverdueCount)} past target
            </p>
          </td>
          <td className="px-3 py-4 tabular-nums">
            <p data-cy="queue-closed">{count(stats.closedCount)} closed</p>
            {hasBreakdown ? (
              <>
                <p
                  data-cy="queue-outcomes"
                  className="mt-1 whitespace-nowrap text-xs text-gray-600 dark:text-gray-300"
                >
                  {count(acknowledged)} ack / {count(actioned)} action
                </p>
                {stats.closedCount! > 0 && (
                  <div
                    aria-hidden="true"
                    className="mt-2 h-1.5 max-w-[11rem] overflow-hidden rounded-full bg-slate-300 dark:bg-slate-600"
                  >
                    <div
                      className="h-full bg-blue-600 dark:bg-blue-400"
                      style={{
                        width: `${(actioned / stats.closedCount!) * 100}%`,
                      }}
                    />
                  </div>
                )}
              </>
            ) : (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Breakdown unavailable
              </p>
            )}
            <Coverage count={coverage.closedCount} days={window.days} />
          </td>
          <td className="px-3 py-4 text-right tabular-nums">
            <span data-cy="queue-escalated">{count(stats.escalatedCount)}</span>
            <Coverage count={coverage.escalatedCount} days={window.days} />
          </td>
          <td className="px-3 py-4 text-right tabular-nums">
            <span data-cy="queue-handling">
              {stats.avgHandlingTimeSec != null
                ? formatDuration(stats.avgHandlingTimeSec)
                : '—'}
            </span>
            <Coverage count={coverage.avgHandlingTimeSec} days={window.days} />
          </td>
          <td className="px-5 py-4 text-right tabular-nums">
            <span
              data-cy="queue-target-rate"
              className="inline-block rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
            >
              {targetRate != null ? `${targetRate}%` : '—'}
            </span>
            <p className="mt-1 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
              {targeted == null
                ? 'Target results unavailable'
                : targeted === 0
                  ? 'No targeted closures'
                  : `${count(stats.closureTargetMetCount)} / ${count(targeted)} met`}
            </p>
            <Coverage
              count={coverage.closureTargetMetCount}
              days={window.days}
            />
          </td>
        </>
      )}
    </tr>
  )
}
