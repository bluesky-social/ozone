import { getReasonLabel } from '@/reports/helpers/getType'
import type { ToolsOzoneReportGetStatGroupDetails } from '@atproto/api'

export function ReportTypeBreakdown({
  data,
  reportTypes = [],
  isLoading,
  isError,
  onRetry,
}: {
  data?: ToolsOzoneReportGetStatGroupDetails.OutputSchema
  reportTypes?: string[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}) {
  const breakdown =
    !isLoading && !isError ? data?.reportTypeBreakdown : undefined
  const counts = new Map(
    breakdown?.stats.map(({ reportType, inboundCount }) => [
      reportType,
      inboundCount,
    ]),
  )
  const rows = breakdown
    ? [...new Set([...reportTypes, ...counts.keys()])]
        .map((reportType) => ({
          reportType,
          inboundCount: counts.get(reportType) ?? 0,
        }))
        .sort(
          (a, b) =>
            b.inboundCount - a.inboundCount ||
            a.reportType.localeCompare(b.reportType),
        )
    : []
  const count = (value?: number) => value?.toLocaleString() ?? '—'

  return (
    <section
      aria-label="Report type breakdown"
      className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
    >
      <h2 className="font-medium">Inbound by report type</h2>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Unmuted reports created during the selected date range.
        Configured report types with no matching reports are shown as zero.
      </p>
      {isLoading ? (
        <p role="status" className="mt-3 text-sm">
          Loading report types...
        </p>
      ) : isError ? (
        <p role="alert" className="mt-3 text-sm">
          Failed to load report types.{' '}
          <button type="button" className="underline" onClick={onRetry}>
            Retry
          </button>
        </p>
      ) : null}
      {rows.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 dark:text-gray-400">
                <th scope="col" className="pb-2 pr-4 text-left font-medium">
                  Report type
                </th>
                {['Inbound', 'Share'].map((label) => (
                  <th
                    key={label}
                    scope="col"
                    className="whitespace-nowrap pb-2 pl-4 text-right font-medium"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {rows.map((row) => (
                <tr key={row.reportType}>
                  <th
                    scope="row"
                    title={row.reportType}
                    className="py-2 pr-4 text-left text-xs font-medium"
                  >
                    {getReasonLabel(row.reportType)}
                    {row.reportType.startsWith(
                      'com.atproto.moderation.defs#',
                    ) && (
                      <span className="ml-1 text-gray-400 dark:text-gray-500">
                        (legacy)
                      </span>
                    )}
                  </th>
                  <td className="py-2 pl-4 text-right tabular-nums">
                    {count(row.inboundCount)}
                  </td>
                  <td className="py-2 pl-4 text-right tabular-nums">
                    {breakdown && breakdown.totalCount > 0
                      ? `${((row.inboundCount / breakdown.totalCount) * 100).toFixed(1)}%`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !isLoading && !isError && data ? (
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          No inbound reports in the selected range.
        </p>
      ) : null}
      {data && breakdown && !isError && (
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          {breakdown.totalCount.toLocaleString()} reports · Updated{' '}
          <time dateTime={data.computedAt}>
            {new Date(data.computedAt).toLocaleString()}
          </time>
        </p>
      )}
    </section>
  )
}
