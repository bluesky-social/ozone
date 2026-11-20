import { ReasonBadge } from '@/reports/ReasonBadge'
import type { ToolsOzoneReportGetStatGroupDetails } from '@atproto/api'
import { StatsTableLayout } from './StatsTableLayout'

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
        <div className="mt-4">
          <StatsTableLayout
            headings={
              <>
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
              </>
            }
          >
            {rows.map((row) => (
              <tr key={row.reportType}>
                <th
                  scope="row"
                  title={row.reportType}
                  className="py-2 pr-4 text-left text-xs font-medium"
                >
                  <ReasonBadge reasonType={row.reportType} />
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
          </StatsTableLayout>
        </div>
      ) : !isLoading && !isError && data ? (
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          No inbound reports in the selected range.
        </p>
      ) : null}
    </section>
  )
}
