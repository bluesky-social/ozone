import { useTitle } from 'react-use'
import { QueueList } from '@/assignments/beta/QueueList'
import { useAssignmentsUpgrade } from '@/lib/assignments/useAssignmentsRealtime'

export default function QueuesPageContent() {
  useTitle('Queues2')
  useAssignmentsUpgrade()
  return (
    <div className="w-5/6 sm:w-3/4 md:w-2/3 lg:w-1/2 mx-auto my-4 dark:text-gray-100">
      <QueueList />
    </div>
  )
}
