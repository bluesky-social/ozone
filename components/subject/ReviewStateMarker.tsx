import { ToolsOzoneModerationDefs } from '@atproto/api'
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  ScaleIcon,
  ShieldExclamationIcon,
  NoSymbolIcon,
} from '@heroicons/react/20/solid'
import Link from 'next/link'

const reviewStateDescription = {
  [ToolsOzoneModerationDefs.REVIEWOPEN]: 'This subject requires a human review',
  [ToolsOzoneModerationDefs.REVIEWESCALATED]: 'This subject has been escalated',
  [ToolsOzoneModerationDefs.REVIEWCLOSED]:
    'This subject has been reviewed and closed',
  [ToolsOzoneModerationDefs.REVIEWNONE]:
    'This subject received moderation events but no human review is necessary as of now',
}

const reviewStateToText = {
  [ToolsOzoneModerationDefs.REVIEWOPEN]: 'Requires Review',
  [ToolsOzoneModerationDefs.REVIEWESCALATED]: 'Escalated',
  [ToolsOzoneModerationDefs.REVIEWCLOSED]: 'Reviewed',
  [ToolsOzoneModerationDefs.REVIEWNONE]: 'Review N/A',
}

const reviewStateToColor = {
  [ToolsOzoneModerationDefs.REVIEWOPEN]: {
    bg: 'bg-yellow-200 dark:bg-yellow-200',
    text: 'text-yellow-800 dark:text-yellow-500',
  },
  [ToolsOzoneModerationDefs.REVIEWESCALATED]: {
    bg: 'bg-orange-200 dark:bg-orange-200',
    text: 'text-orange-800 dark:text-orange-500',
  },
  [ToolsOzoneModerationDefs.REVIEWCLOSED]: {
    bg: 'bg-green-200 dark:bg-green-200',
    text: 'text-green-800 dark:text-green-500',
  },
  [ToolsOzoneModerationDefs.REVIEWNONE]: {
    bg: 'bg-gray-200 dark:bg-gray-200',
    text: 'text-gray-800 dark:text-gray-600',
  },
}

const reviewStateToIcon = {
  [ToolsOzoneModerationDefs.REVIEWOPEN]: ExclamationCircleIcon,
  [ToolsOzoneModerationDefs.REVIEWESCALATED]: ExclamationTriangleIcon,
  [ToolsOzoneModerationDefs.REVIEWCLOSED]: CheckCircleIcon,
  [ToolsOzoneModerationDefs.REVIEWNONE]: NoSymbolIcon,
}

export const SubjectReviewStateBadge = ({
  subjectStatus,
  className,
}: {
  subjectStatus: ToolsOzoneModerationDefs.SubjectStatusView
  className?: string
}) => {
  let text =
    reviewStateToText[subjectStatus.reviewState] || subjectStatus.reviewState
  let color = reviewStateToColor[subjectStatus.reviewState]
    ? `${reviewStateToColor[subjectStatus.reviewState].bg} ${
        reviewStateToColor[subjectStatus.reviewState].text
      }`
    : 'bg-gray-200 text-gray-800'

  if (subjectStatus.takendown) {
    text += '(Taken Down)'
    color = 'bg-red-200 text-red-800'
  }

  if (
    subjectStatus.muteUntil &&
    new Date(subjectStatus.muteUntil) > new Date()
  ) {
    text += '(Muted)'
    color = 'bg-pink-200 text-pink-800'
  }

  if (
    subjectStatus.muteReportingUntil &&
    new Date(subjectStatus.muteReportingUntil) > new Date()
  ) {
    text += '(Muted Reporting)'
    color = 'bg-pink-200 text-pink-800'
  }

  if (subjectStatus.appealed) {
    text += '(Appealed)'
    color = 'bg-orange-200 text-orange-800'
  }

  return (
    <span
      title={reviewStateDescription[subjectStatus.reviewState]}
      className={`${color} inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {text}
    </span>
  )
}

export const ReviewStateIcon = ({
  subjectStatus,
  className,
}: {
  subjectStatus: ToolsOzoneModerationDefs.SubjectStatusView
  className?: string
}) => {
  let text =
    reviewStateToText[subjectStatus.reviewState] || subjectStatus.reviewState
  let color =
    reviewStateToColor[subjectStatus.reviewState]?.text || 'text-gray-800'
  let Icon = reviewStateToIcon[subjectStatus.reviewState] || CheckCircleIcon

  if (subjectStatus.takendown) {
    text = 'Taken Down'
    color = 'text-red-800 dark:text-red-600'
    Icon = ShieldExclamationIcon
  }

  // Appealed status should override takendown status specific icon
  if (subjectStatus.appealed) {
    text = 'Appealed'
    color = 'text-orange-500 dark:text-orange-400'
    Icon = ScaleIcon
  }

  return (
    <Icon
      title={text}
      className={`h-6 w-6 inline-block align-text-bottom ${color} ${className}`}
    />
  )
}

export const ReviewStateIconLink = ({
  subjectStatus,
  className,
  children,
}: {
  subjectStatus: ToolsOzoneModerationDefs.SubjectStatusView
  className?: string
  children?: React.ReactNode
}) => {
  let urlParam = ''
  if (subjectStatus.subject.$type === 'com.atproto.repo.strongRef') {
    urlParam = `uri=${subjectStatus.subject.uri}`
  } else {
    urlParam = `did=${subjectStatus.subject.did}`
  }
  return (
    <Link href={`/subject-status?${urlParam}`}>
      {children || (
        <ReviewStateIcon subjectStatus={subjectStatus} className={className} />
      )}
    </Link>
  )
}
