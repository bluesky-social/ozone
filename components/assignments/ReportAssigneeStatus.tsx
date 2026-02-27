'use client'

import { Assignee } from './Assignee'
import { ToolsOzoneReportDefs } from '@atproto/api'
import { useAssignReport } from './useAssignments'

interface ReportAssigneeStatusProps {
  assignment: Partial<ToolsOzoneReportDefs.AssignmentView> & {
    reportId: number
  }
}

export function ReportAssigneeStatus({
  assignment,
}: ReportAssigneeStatusProps) {
  const assignReport = useAssignReport()

  const handleAssign = () => {
    assignReport.mutate({
      reportId: assignment.reportId,
      queueId: assignment.queueId,
      assign: true,
    })
  }

  const handleUnassign = () => {
    assignReport.mutate({
      reportId: assignment.reportId,
      queueId: assignment.queueId,
      assign: false,
    })
  }

  return (
    <div>
      {assignment.did ? (
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
