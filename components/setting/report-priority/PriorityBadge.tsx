import { formatDuration } from '@/lib/util'
import type { ToolsOzoneReportDefs } from '@atproto/api'

export function PriorityBadge({
  report,
}: {
  report: Pick<
    ToolsOzoneReportDefs.ReportView,
    'priorityLevel' | 'priorityTargetMinutes'
  >
}) {
  if (!report.priorityLevel) return null
  const target = report.priorityTargetMinutes
    ? ` · ${formatDuration(report.priorityTargetMinutes * 60)} target`
    : ''
  return (
    <span
      className="inline-flex items-center rounded-md bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800 dark:bg-rose-900 dark:text-rose-200"
      title={`${report.priorityLevel}${target}`}
    >
      {report.priorityLevel}
      {target}
    </span>
  )
}
