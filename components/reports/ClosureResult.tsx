import { formatDuration } from '@/lib/util'
import type { ToolsOzoneReportDefs } from '@atproto/api'

export function ClosureResult({
  report,
}: {
  report: ToolsOzoneReportDefs.ReportView
}) {
  if (report.status !== 'closed') return null
  return (
    <div
      className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm"
      data-cy="report-closure-result"
    >
      <span>
        Resolution time:{' '}
        {report.resolutionTimeSec != null
          ? formatDuration(report.resolutionTimeSec)
          : 'Unavailable'}
      </span>
      <span
        className={
          report.priorityTargetMet === true
            ? 'text-green-700 dark:text-green-300'
            : report.priorityTargetMet === false
              ? 'text-amber-700 dark:text-amber-300'
              : 'text-gray-500 dark:text-gray-400'
        }
      >
        {report.priorityTargetMet === true
          ? 'Closure target met'
          : report.priorityTargetMet === false
            ? 'Closure target missed'
            : report.priorityTargetMinutes != null
              ? 'Closure target result unavailable'
              : 'No closure target'}
      </span>
    </div>
  )
}
