import { ReportAssigneeStatus } from '@/assignments/ReportAssigneeStatus'
import {
  useAutoAssignReport,
  useReportAssignments,
} from '@/lib/assignments/useAssignmentsRealtime'
import { useParams } from 'next/navigation'
import { useTitle } from 'react-use'

export default function ReportDetailContent() {
  const { id } = useParams<{ id: string }>()
  const reportId = Number(id)

  useTitle(`Report #${reportId}`)
  useAutoAssignReport({ reportId })

  const { data: assignments = [] } = useReportAssignments({
    onlyActiveAssignments: true,
    reportIds: [reportId],
  })
  const assignment = assignments[0]

  return (
    <div className="w-5/6 sm:w-3/4 md:w-2/3 lg:w-1/2 mx-auto my-4 dark:text-gray-100">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
        Report #{reportId}
      </h1>
      <ReportAssigneeStatus assignment={{ ...assignment, reportId }} />
    </div>
  )
}
