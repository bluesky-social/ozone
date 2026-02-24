import { useParams } from 'next/navigation'
import { useTitle } from 'react-use'
import { useAutoClaimReport } from '@/assignments/useAssignments'

export default function ReportDetailContent() {
  const { id } = useParams<{ id: string }>()
  const reportId = Number(id)

  useTitle(`Report #${reportId}`)
  useAutoClaimReport({ reportId, queueId: 1 })

  return (
    <div className="w-5/6 sm:w-3/4 md:w-2/3 lg:w-1/2 mx-auto my-4 dark:text-gray-100">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
        Report #{reportId}
      </h1>
    </div>
  )
}
