'use client'

import { XMarkIcon } from '@heroicons/react/24/outline'
import { useClaimReport, useReportAssignments } from './useAssignments'

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
  const { mutate: claimReport } = useClaimReport()

  const reportAssignment = assignments.find((a) => a.reportId === reportId)

  const handleClaim = () => {
    claimReport({ reportId, queueId, assign: true })
  }

  const handleRemove = () => {
    claimReport({ reportId, queueId, assign: false })
  }

  return (
    <div>
      {reportAssignment ? (
        <span className="group inline-flex items-center gap-1 rounded bg-gray-100 dark:bg-slate-700 px-2 py-0.5 text-xs text-gray-700 dark:text-gray-200">
          {reportAssignment.did.slice(0, 20)}...
          {handleRemove && (
            <button
              onClick={handleRemove}
              className="hidden group-hover:inline-flex text-gray-400 hover:text-red-500"
              title="Remove assignee"
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          )}
        </span>
      ) : (
        <button
          onClick={handleClaim}
          className="text-xs text-indigo-600 dark:text-teal-400 hover:underline"
        >
          Claim
        </button>
      )}
    </div>
  )
}
