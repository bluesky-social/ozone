import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { formatDuration } from '@/lib/util'
import { useQueries } from '@tanstack/react-query'
import Link from 'next/link'
import { getHrefFromGroup, REPORT_CATEGORIES } from '.'
import { statReasonTypes } from '../helpers/getType'
import { resolveStatsWindow, type StatsWindow } from './statsWindow'
import {
  historicalStatsQueryOptions,
  liveStatsQueryOptions,
} from './useReportStats'

const scopes = REPORT_CATEGORIES.map((group) => ({
  reportTypes: group.category ? statReasonTypes[group.category] : undefined,
}))

function useReportTypeStats(window: StatsWindow) {
  const agent = useLabelerAgent()
  const isToday = window.period === 'Today'
  const live = useQueries({
    queries: scopes.map((params) => ({
      ...liveStatsQueryOptions(agent, params),
      enabled: isToday,
    })),
  })
  const history = useQueries({
    queries: scopes.map((params) => ({
      ...historicalStatsQueryOptions(agent, {
        ...params,
        startDate: window.startDate,
        endDate: window.endDate,
        limit: window.days,
      }),
      enabled: !isToday,
      refetchInterval: 5 * 60 * 1000,
    })),
  })
  return REPORT_CATEGORIES.map((group, i) => {
    const query = isToday ? live[i] : history[i]
    return {
      group,
      ...resolveStatsWindow(window, live[i].data, history[i].data?.stats),
      isLoading: query.isLoading,
      isError: query.isError,
      refetch: query.refetch,
    }
  }).sort((a, b) => (b.stats.inboundCount ?? -1) - (a.stats.inboundCount ?? -1))
}

type TypeStats = ReturnType<typeof useReportTypeStats>[number]

function Coverage({ count, days }: { count?: number; days: number }) {
  if (days === 1 || (count ?? 0) >= days) return null
  return (
    <span className="mt-1 block text-[11px] font-normal text-amber-700 dark:text-amber-300">
      {count ?? 0} of {days} days
    </span>
  )
}

function RowStatus({ row, columns }: { row: TypeStats; columns: number }) {
  return (
    <td
      colSpan={columns}
      className="py-3 text-right text-xs text-gray-500 dark:text-gray-400"
    >
      {row.isLoading ? (
        <span role="status">Loading...</span>
      ) : (
        <span role="alert" className="text-red-600 dark:text-red-400">
          Unavailable.{' '}
          <button
            type="button"
            onClick={() => row.refetch()}
            className="underline"
          >
            Retry
          </button>
        </span>
      )}
    </td>
  )
}

export function ReportTypePanels({ window }: { window: StatsWindow }) {
  const rows = useReportTypeStats(window)
  const maxInbound = Math.max(
    1,
    ...rows.map((row) => row.stats.inboundCount ?? 0),
  )
  const panelClass =
    'min-w-0 rounded-xl border border-gray-200 bg-white p-4 text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 sm:p-5'
  const headingClass =
    'pb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400'
  return (
    <div className="mb-6 grid items-stretch gap-4 xl:grid-cols-2">
      <section
        aria-label="Report type"
        data-cy="report-type-panel"
        className={panelClass}
      >
        <h2 className="font-semibold">Report type</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Grouped report reasons · {window.label} (UTC)
        </p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th scope="col" className={`${headingClass} text-left`}>
                  Type
                </th>
                <th scope="col" className={`${headingClass} px-3 text-right`}>
                  Inbound
                </th>
                <th scope="col" className={`${headingClass} text-right`}>
                  Action rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {rows.map((row) => (
                <tr key={row.group.title}>
                  <th
                    scope="row"
                    className="w-2/5 py-3 pr-3 text-left text-xs font-medium"
                  >
                    <Link
                      href={getHrefFromGroup(row.group)}
                      className="hover:text-blue-600 hover:underline dark:hover:text-blue-400"
                    >
                      {row.group.title}
                    </Link>
                  </th>
                  {row.isLoading || row.isError ? (
                    <RowStatus row={row} columns={2} />
                  ) : (
                    <>
                      <td className="px-3 py-3 text-right text-xs tabular-nums">
                        <div className="flex items-center justify-end gap-3">
                          <div
                            aria-hidden="true"
                            className="hidden h-2 min-w-[2rem] flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700 sm:block"
                          >
                            {row.stats.inboundCount != null && (
                              <div
                                className="h-full rounded-full bg-blue-600 dark:bg-blue-400"
                                style={{
                                  width: `${(row.stats.inboundCount / maxInbound) * 100}%`,
                                }}
                              />
                            )}
                          </div>
                          <span
                            data-cy="type-inbound"
                            className="font-semibold"
                          >
                            {row.stats.inboundCount?.toLocaleString() ?? '—'}
                          </span>
                        </div>
                        <Coverage
                          count={row.coverage.inboundCount}
                          days={window.days}
                        />
                      </td>
                      <td className="py-3 text-right text-xs tabular-nums">
                        <span data-cy="type-action-rate">
                          {row.stats.actionRate != null
                            ? `${row.stats.actionRate}%`
                            : '—'}
                        </span>
                        <Coverage
                          count={row.coverage.actionRate}
                          days={window.days}
                        />
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Action rate is the share of closed reports that were actioned.
        </p>
      </section>
      <section
        aria-label="Closure target by report type"
        data-cy="report-type-targets"
        className={panelClass}
      >
        <h2 className="font-semibold">Closure target by report type</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Closed reports · {window.label} (UTC)
        </p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[30rem] text-sm">
            <thead>
              <tr>
                <th scope="col" className={`${headingClass} text-left`}>
                  Type
                </th>
                <th scope="col" className={`${headingClass} px-2 text-right`}>
                  Avg handling
                </th>
                <th scope="col" className={`${headingClass} px-2 text-right`}>
                  Avg resolution
                </th>
                <th scope="col" className={`${headingClass} px-2 text-right`}>
                  Met / targeted
                </th>
                <th scope="col" className={`${headingClass} text-right`}>
                  Target met
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {rows.map((row) => {
                const { stats } = row
                const targeted =
                  stats.closureTargetMetCount != null &&
                  stats.closureTargetMissedCount != null
                    ? stats.closureTargetMetCount +
                      stats.closureTargetMissedCount
                    : undefined
                const rate = targeted
                  ? Math.round((stats.closureTargetMetCount! / targeted) * 100)
                  : undefined
                return (
                  <tr key={row.group.title}>
                    <th
                      scope="row"
                      className="py-3 pr-2 text-left text-xs font-medium"
                    >
                      <Link
                        href={getHrefFromGroup(row.group)}
                        className="hover:text-blue-600 hover:underline dark:hover:text-blue-400"
                      >
                        {row.group.title}
                      </Link>
                    </th>
                    {row.isLoading || row.isError ? (
                      <RowStatus row={row} columns={4} />
                    ) : (
                      <>
                        <td className="px-2 py-3 text-right text-xs tabular-nums">
                          <span data-cy="type-handling-time">
                            {stats.avgHandlingTimeSec != null
                              ? formatDuration(stats.avgHandlingTimeSec)
                              : '—'}
                          </span>
                          <Coverage
                            count={row.coverage.avgHandlingTimeSec}
                            days={window.days}
                          />
                        </td>
                        <td className="px-2 py-3 text-right text-xs tabular-nums">
                          <span data-cy="type-resolution-time">
                            {stats.avgResolutionTimeSec != null
                              ? formatDuration(stats.avgResolutionTimeSec)
                              : '—'}
                          </span>
                          <Coverage
                            count={row.coverage.avgResolutionTimeSec}
                            days={window.days}
                          />
                        </td>
                        <td className="px-2 py-3 text-right text-xs tabular-nums">
                          <span data-cy="type-target-samples">
                            {targeted != null
                              ? `${stats.closureTargetMetCount!.toLocaleString()} / ${targeted.toLocaleString()}`
                              : '—'}
                          </span>
                          <Coverage
                            count={row.coverage.closureTargetMetCount}
                            days={window.days}
                          />
                        </td>
                        <td className="py-3 text-right text-xs tabular-nums">
                          <span
                            data-cy="type-target-rate"
                            className="inline-block rounded-full bg-blue-50 px-2 py-1 font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          >
                            {rate != null ? `${rate}%` : '—'}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 space-y-1 text-xs text-gray-500 dark:text-gray-400">
          <p>
            <strong className="font-medium">Handling time:</strong> time from
            assignment to closure, for reports with an assignment timestamp.
          </p>
          <p>
            <strong className="font-medium">Resolution time:</strong> time from
            report creation to its latest closure, including time waiting in the
            backlog.
          </p>
          <p>
            Both averages are weighted by their report samples across the
            selected window. Target results include only reports with a saved
            closure target.
          </p>
        </div>
      </section>
    </div>
  )
}
