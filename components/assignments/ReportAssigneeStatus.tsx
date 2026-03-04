'use client'

import { Assignee } from './Assignee'
import { ToolsOzoneReportDefs } from '@atproto/api'
import { useAssignReport, useUnassignReport } from './useAssignments'

interface ReportAssigneeStatusProps {
  assignment?: ToolsOzoneReportDefs.AssignmentView
}

export function ReportAssigneeStatus({
  assignment,
}: ReportAssigneeStatusProps) {
  const assignReport = useAssignReport()
  const unassignReport = useUnassignReport()

  const handleAssign = () => {
    if (!assignment) return
    assignReport.mutate({
      reportId: assignment.reportId,
      queueId: assignment.queue?.id,
    })
  }

  const handleUnassign = () => {
    if (!assignment) return
    unassignReport.mutate({
      reportId: assignment.reportId,
    })
  }

  return (
    <div>
      {assignment?.did ? (
        <Assignee did={assignment.did} onRemove={handleUnassign} />
      ) : (
        <button
          onClick={handleAssign}
          className="text-xs text-indigo-600 dark:text-teal-400 hover:underline"
        >
          Assign
        </button>
      )}
    </div>
  )
}
