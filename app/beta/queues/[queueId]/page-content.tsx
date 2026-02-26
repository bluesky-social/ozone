import { useParams } from 'next/navigation'
import { useTitle } from 'react-use'
import { ReportList } from '@/assignments/ReportList'

export default function QueueDetailContent() {
  const { queueId } = useParams<{ queueId: string }>()
  const id = Number(queueId)

  useTitle(`Queue #${id}`)

  return (
    <div className="w-5/6 sm:w-3/4 md:w-2/3 lg:w-1/2 mx-auto my-4 dark:text-gray-100">
      <ReportList queueId={id} />
    </div>
  )
}
