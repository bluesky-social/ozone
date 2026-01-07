import { Checkbox } from '@/common/forms'
import { useQueueFilter } from '../useQueueFilter'

export const QueueFilterHostingStatus = () => {
  const { queueFilters, toggleHostingStatus } = useQueueFilter()

  const isDeletedOnly =
    queueFilters.hostingStatuses?.includes('deleted') ?? false

  return (
    <div className='pl-2 pt-3'>
      <Checkbox
        className="flex items-center"
        label="Only include deleted record/account"
        checked={isDeletedOnly}
        onChange={() => toggleHostingStatus()}
      />
    </div>
  )
}
