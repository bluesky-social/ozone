'use client'

import Link from 'next/link'
import { ReportAssigneeStatus } from './ReportAssigneeStatus'
import { ToolsOzoneReportDefs } from '@atproto/api'
import { useMemo } from 'react'
import { useReportAssignments } from './useAssignments'

const REPORTS_PER_QUEUE = 25

export function ReportList({ queueId }: { queueId: number }) {
  const startId = (queueId - 1) * REPORTS_PER_QUEUE + 1
  const reports = Array.from(
    { length: REPORTS_PER_QUEUE },
    (_, i) => startId + i,
  )
  const { data: assignments = [] } = useReportAssignments({
    onlyActiveAssignments: true,
    reportIds: reports,
  })

  const assignmentMap: Map<
    number,
    ToolsOzoneReportDefs.AssignmentView | undefined
  > = useMemo(() => {
    const map = new Map()
    reports.forEach((reportId) => {
      const assignment = assignments.find((a) => a.reportId === reportId)
      map.set(reportId, assignment)
    })
    return map
  }, [assignments, reports])

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Reports
        </h2>
      </div>
      <div className="space-y-3">
        {assignmentMap.size === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No active assignments.
          </p>
        )}
        {Array.from(assignmentMap.entries()).map(([reportId, assignment]) => (
          <div key={reportId}>
            <Link
              href={`/beta/reports/${reportId}`}
              className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-md border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Report #{reportId}
              </span>
              <div onClick={(e) => e.preventDefault()}>
                <ReportAssigneeStatus
                  assignment={{ ...assignment, reportId, queueId }}
                />
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
