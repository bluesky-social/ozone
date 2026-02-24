'use client'

import Link from 'next/link'
import { ReportAssigneeStatus } from '../ReportAssigneeStatus'

export function ReportList() {
  const reports = Array.from({ length: 25 }, (_, i) => i + 1)

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Reports
        </h2>
      </div>
      <div className="space-y-3">
        {reports.map((reportId) => (
          <div key={reportId}>
            <Link
              href={`/beta/reports/${reportId}`}
              className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-md border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Report #{reportId}
              </span>
              <div onClick={(e) => e.preventDefault()}>
                <ReportAssigneeStatus reportId={reportId} />
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
