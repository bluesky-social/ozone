'use client'

import { useAssignments, useClaimReport } from './useAssignments'
import { ReportAssignee } from './ReportAssignee'

interface ReportAssigneeStatusProps {
  reportId: number
  queueId: number
}

export function ReportAssigneeStatus({
  reportId,
  queueId,
}: ReportAssigneeStatusProps) {
  const { data: assignments = [] } = useAssignments({
    onlyActiveAssignments: true,
    queueIds: [queueId],
  })
  const { mutate: claimReport } = useClaimReport()

  const reportAssignment = assignments.find((a) => a.reportId === reportId)

  const handleClaim = () => {
    claimReport({ reportId, queueId, assign: true })
  }

  const handleRemove = () => {
    claimReport({ reportId, queueId, assign: false })
  }

  if (reportAssignment) {
    return <ReportAssignee did={reportAssignment.did} onRemove={handleRemove} />
  }

  return (
    <button
      onClick={handleClaim}
      className="text-xs text-indigo-600 dark:text-teal-400 hover:underline"
    >
      Claim
    </button>
  )
}
