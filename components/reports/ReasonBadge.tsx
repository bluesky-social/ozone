import { ComAtprotoModerationDefs } from '@atproto/api'
import { ComponentProps } from 'react'

export function ReasonBadgeButton(
  props: {
    reasonType: string
    className?: string
    isHighlighted?: boolean
  } & ComponentProps<'button'>,
) {
  const { reasonType, className = '', isHighlighted = false, ...rest } = props
  const readable = reasonType.replace('com.atproto.moderation.defs#reason', '')
  const color = isHighlighted
    ? 'bg-indigo-600 border-indigo-500 text-white dark:bg-teal-600 dark:border-teal-500'
    : reasonColors[reasonType] ?? reasonColors.default
  return (
    <button
      className={`${color} inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${className}`}
      {...rest}
    >
      {readable}
    </button>
  )
}

export function ReasonBadge(props: { reasonType: string; className?: string }) {
  const { reasonType, className = '' } = props
  const readable = reasonType.replace('com.atproto.moderation.defs#reason', '')
  const color = reasonColors[reasonType] ?? reasonColors.default
  return (
    <span
      className={`${color} inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {readable}
    </span>
  )
}
const reasonColors: Record<string, string> = {
  [ComAtprotoModerationDefs.REASONSPAM]: 'bg-amber-100 text-amber-800',
  [ComAtprotoModerationDefs.REASONOTHER]: 'bg-violet-100 text-violet-800',
  [ComAtprotoModerationDefs.REASONVIOLATION]: 'bg-red-100 text-red-800',
  [ComAtprotoModerationDefs.REASONMISLEADING]: 'bg-amber-100 text-amber-800',
  [ComAtprotoModerationDefs.REASONSEXUAL]: 'bg-amber-100 text-amber-800',
  [ComAtprotoModerationDefs.REASONRUDE]: 'bg-orange-100 text-orange-800',
  default: 'bg-gray-200 text-gray-800',
}
