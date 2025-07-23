import { ComponentProps } from 'react'
import { AGE_ASSURANCE_STATES } from './constants'
import {
  CheckCircleIcon,
  ClockIcon,
  QuestionMarkCircleIcon,
  ArrowPathIcon,
  XCircleIcon,
} from '@heroicons/react/20/solid'
import { capitalize } from '@/lib/util'

export function AgeAssuranceBadgeButton(
  props: {
    ageAssuranceState: string
    className?: string
    isHighlighted?: boolean
  } & ComponentProps<'button'>,
) {
  const {
    ageAssuranceState,
    className = '',
    isHighlighted = false,
    ...rest
  } = props
  const readable = capitalize(ageAssuranceState)
  const color = isHighlighted
    ? 'bg-indigo-600 border-indigo-500 text-white dark:bg-teal-600 dark:border-teal-500'
    : ageAssuranceColors[ageAssuranceState] ?? ageAssuranceColors.default
  const IconComponent =
    ageAssuranceIcons[ageAssuranceState] ?? QuestionMarkCircleIcon
  const title =
    ageAssuranceDescriptions[ageAssuranceState] ??
    ageAssuranceDescriptions.default
  return (
    <button
      className={`${color} inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${className}`}
      title={title}
      {...rest}
    >
      <IconComponent
        className={`h-3 w-3 ${isHighlighted ? 'text-white' : ''}`}
      />
      {readable}
    </button>
  )
}

export function AgeAssuranceBadge(props: {
  ageAssuranceState: string
  className?: string
}) {
  const { ageAssuranceState, className = '' } = props

  const readable = capitalize(ageAssuranceState)
  const color =
    ageAssuranceColors[ageAssuranceState] ?? ageAssuranceColors.default
  const IconComponent =
    ageAssuranceIcons[ageAssuranceState] ?? QuestionMarkCircleIcon
  const title =
    ageAssuranceDescriptions[ageAssuranceState] ??
    ageAssuranceDescriptions.default
  return (
    <span
      className={`${color} inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${className}`}
      title={title}
    >
      <IconComponent className="h-3 w-3" />
      {readable}
    </span>
  )
}
const ageAssuranceColors: Record<string, string> = {
  [AGE_ASSURANCE_STATES.ASSURED]:
    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  [AGE_ASSURANCE_STATES.PENDING]:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  [AGE_ASSURANCE_STATES.UNKNOWN]:
    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  [AGE_ASSURANCE_STATES.RESET]:
    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  [AGE_ASSURANCE_STATES.BLOCKED]:
    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  default: 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200',
}

const ageAssuranceIcons: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  [AGE_ASSURANCE_STATES.ASSURED]: CheckCircleIcon,
  [AGE_ASSURANCE_STATES.PENDING]: ClockIcon,
  [AGE_ASSURANCE_STATES.UNKNOWN]: QuestionMarkCircleIcon,
  [AGE_ASSURANCE_STATES.RESET]: ArrowPathIcon,
  [AGE_ASSURANCE_STATES.BLOCKED]: XCircleIcon,
}

const ageAssuranceDescriptions: Record<string, string> = {
  [AGE_ASSURANCE_STATES.ASSURED]:
    'User has successfully completed the age assurance process',
  [AGE_ASSURANCE_STATES.PENDING]:
    'User began age assurance process but never completed it successfully',
  [AGE_ASSURANCE_STATES.UNKNOWN]:
    'User never started the age assurance process',
  [AGE_ASSURANCE_STATES.RESET]:
    'A moderator reset their age assurance status allowing them to redo the assurance process.',
  [AGE_ASSURANCE_STATES.BLOCKED]:
    'A moderator blocked the user from completing the age assurance process.',
  default: 'Age assurance status',
}
