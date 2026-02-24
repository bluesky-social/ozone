'use client'

import { Assignee } from './Assignee'
import { useAssignReport, useReportAssignments } from './useAssignments'

interface ReportAssigneeStatusProps {
  reportId: number
  queueId?: number
}

export function ReportAssigneeStatus({
  reportId,
  queueId,
}: ReportAssigneeStatusProps) {
  const { data: assignments = [] } = useReportAssignments({
    onlyActiveAssignments: true,
    reportIds: [reportId],
  })
  const { mutate: assignReport } = useAssignReport()

  const reportAssignment = assignments.find((a) => a.reportId === reportId)

  const handleAssign = () => {
    assignReport({ reportId, queueId, assign: true })
  }

  const handleUnassign = () => {
    assignReport({ reportId, queueId, assign: false })
  }

  return (
    <div>
      {reportAssignment ? (
        <Assignee did={reportAssignment.did} onRemove={handleUnassign} />
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
