import { ComponentProps } from 'react'
import { reasonTypeOptions, groupedReasonTypes } from './helpers/getType'

export function ReasonBadgeButton(
  props: {
    reasonType: string
    className?: string
    isHighlighted?: boolean
  } & ComponentProps<'button'>,
) {
  const { reasonType, className = '', isHighlighted = false, ...rest } = props
  const readable = reasonTypeOptions[reasonType] || getReadableReasonType(reasonType)
  const color = isHighlighted
    ? 'bg-indigo-600 border-indigo-500 text-white dark:bg-teal-600 dark:border-teal-500'
    : getReasonColor(reasonType)
  return (
    <button
      className={`${color} inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${className}`}
      title={reasonType}
      {...rest}
    >
      {readable}
    </button>
  )
}

export function ReasonBadge(props: { reasonType: string; className?: string }) {
  const { reasonType, className = '' } = props
  const readable = reasonTypeOptions[reasonType] || getReadableReasonType(reasonType)
  const color = getReasonColor(reasonType)
  return (
    <span
      className={`${color} inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${className}`}
      title={reasonType}
    >
      {readable}
    </span>
  )
}
// Group-based colors for consistent category styling
const groupColors: Record<string, string> = {
  'Legacy': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  'Appeal': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Violence': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'Sexual': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  'Child Safety': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'Harassment': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'Misleading': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  'Rule Violations': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  'Civic': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  'default': 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
}

// Find which category a reason type belongs to
function getReasonCategory(reasonType: string): string {
  for (const [category, reasonTypes] of Object.entries(groupedReasonTypes)) {
    if (reasonTypes.includes(reasonType)) {
      return category
    }
  }
  return 'default'
}

// Get the color class for a reason type based on its category
function getReasonColor(reasonType: string): string {
  const category = getReasonCategory(reasonType)
  return groupColors[category] || groupColors.default
}

// Fallback function to create readable text for unknown reason types
function getReadableReasonType(reasonType: string): string {
  // Remove namespace prefixes and make more readable
  return reasonType
    .replace('com.atproto.moderation.defs#reason', '')
    .replace('tools.ozone.report.defs#reason', '')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
