import { ClockIcon } from '@heroicons/react/24/outline'
import { formatDuration, intervalToDuration } from 'date-fns'

import { ComponentProps } from 'react'
import { classNames } from '@/lib/util'

export const remainingActionDuration = (durationInHours: number) => {
  return formatDuration(
    intervalToDuration({
      start: new Date(),
      end: new Date(Date.now() + durationInHours * 60 * 60 * 1000),
    }),
    { format: ['days', 'hours', 'minutes'] },
  )
}

export const humanReadableActionDuration = (durationInHours: number) => {
  return formatDuration(
    intervalToDuration({
      start: 0,
      end: durationInHours * 60 * 60 * 1000,
    }),
  )
}

export const getActionDurationWithRemainingTime = (durationInHours: number) => {
  const initialDuration = humanReadableActionDuration(durationInHours)
  const remainingDuration = remainingActionDuration(durationInHours)
  let durationLabel = initialDuration
  if (remainingDuration) {
    durationLabel += ` (${remainingDuration} remaining)`
  }

  return durationLabel
}

export const ActionDurationBadge = ({
  durationInHours,
  className,
  ...rest
}: ComponentProps<'span'> & {
  durationInHours: number
}) => {
  const duration = humanReadableActionDuration(durationInHours)
  return (
    <span
      className={classNames(
        'bg-gray-200 rounded-md px-2 py-0.5 text-xs font-medium',
        className,
      )}
      title={`This action was set to expire in ${duration}`}
      {...rest}
    >
      <ClockIcon className="w-4 h-4 inline-flex items-center" /> {duration}
    </span>
  )
}
