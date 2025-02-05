import { LabelChip } from '@/common/labels'
import { classNames } from '@/lib/util'
import { HandRaisedIcon } from '@heroicons/react/24/solid'

export const PriorityScore = ({
  priorityScore,
  size,
}: {
  priorityScore: number
  size?: 'sm'
}) => {
  if (!priorityScore) {
    return null
  }
  return (
    <LabelChip
      className={classNames(
        'flex flex-row gap-1 items-center bg-orange-300 text-orange-800',
        size === 'sm' ? 'text-xs px-1 py-0' : '',
      )}
      title={`This subject's priority score is set to ${priorityScore} out of 100. Subjects with higher score should be reviewed more urgently.`}
    >
      <HandRaisedIcon className="h-3 w-3" />
      {priorityScore}
    </LabelChip>
  )
}
