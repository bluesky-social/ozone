'use client'

import { Assignee } from './Assignee'
import { useAssignReport } from '../../lib/assignments/useAssignmentsRealtime'
import { ToolsOzoneReportDefs } from '@atproto/api'

interface ReportAssigneeStatusProps {
  assignment: Partial<ToolsOzoneReportDefs.AssignmentView> & {
    reportId: number
  }
}

export function ReportAssigneeStatus({
  assignment,
}: ReportAssigneeStatusProps) {
  const { mutate: assignReport } = useAssignReport()

  const handleAssign = () => {
    assignReport({
      reportId: assignment.reportId,
      queueId: assignment.queueId,
      assign: true,
    })
  }

  const handleUnassign = () => {
    assignReport({
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
          Claim
        </button>
      )}
    </div>
  )
}
