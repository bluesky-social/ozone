import { useParams } from 'next/navigation'
import { useTitle } from 'react-use'
import { useAutoAssignReport } from '@/assignments/useAssignments'
import { ReportAssigneeStatus } from '@/assignments/ReportAssigneeStatus'

export default function ReportDetailContent() {
  const { id } = useParams<{ id: string }>()
  const reportId = Number(id)

  useTitle(`Report #${reportId}`)
  useAutoAssignReport({ reportId })

  return (
    <div className="w-5/6 sm:w-3/4 md:w-2/3 lg:w-1/2 mx-auto my-4 dark:text-gray-100">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
        Report #{reportId}
      </h1>
      <ReportAssigneeStatus reportId={reportId} />
    </div>
  )
}
