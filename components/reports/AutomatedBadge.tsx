import { ToolsOzoneReportDefs } from '@atproto/api'
import { CpuChipIcon } from '@heroicons/react/20/solid'

export function AutomatedBadge({
  report,
}: {
  report?: ToolsOzoneReportDefs.ReportView
}) {
  if (!report || !report.isAutomated) return null

  return (
    <span
      title="This report was created by an automated tool"
      data-cy="automated-badge"
      className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
    >
      <CpuChipIcon className="h-3 w-3" />
      Automated
    </span>
  )
}
