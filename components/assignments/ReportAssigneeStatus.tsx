'use client'

import { Assignee } from './Assignee'
import { ToolsOzoneReportDefs } from '@atproto/api'
import { useAssignReport } from './AssignmentsContext'

interface ReportAssigneeStatusProps {
  assignment: Partial<ToolsOzoneReportDefs.AssignmentView> & {
    reportId: number
  }
}

export function ReportAssigneeStatus({
  assignment,
}: ReportAssigneeStatusProps) {
  const { assignReportModerator, unassignReportModerator } = useAssignReport()

  const handleAssign = () => {
    assignReportModerator(assignment.reportId, assignment.queueId)
  }

  const handleUnassign = () => {
    unassignReportModerator(assignment.reportId, assignment.queueId)
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
