import { ComAtprotoAdminDefs } from '@atproto/api'
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/20/solid'
import Link from 'next/link'

const reviewStateToText = {
  [ComAtprotoAdminDefs.REVIEWOPEN]: 'Requires Review',
  [ComAtprotoAdminDefs.REVIEWESCALATED]: 'Escalated',
  [ComAtprotoAdminDefs.REVIEWCLOSED]: 'Reviewed',
}

const reviewStateToColor = {
  [ComAtprotoAdminDefs.REVIEWOPEN]: {
    bg: 'bg-yellow-200',
    text: 'text-yellow-800',
  },
  [ComAtprotoAdminDefs.REVIEWESCALATED]: {
    bg: 'bg-orange-200',
    text: 'text-orange-800',
  },
  [ComAtprotoAdminDefs.REVIEWCLOSED]: {
    bg: 'bg-green-200',
    text: 'text-green-800',
  },
}

const reviewStateToIcon = {
  [ComAtprotoAdminDefs.REVIEWOPEN]: ExclamationCircleIcon,
  [ComAtprotoAdminDefs.REVIEWESCALATED]: ExclamationTriangleIcon,
  [ComAtprotoAdminDefs.REVIEWCLOSED]: CheckCircleIcon,
}

export const SubjectReviewStateBadge = ({
  subjectStatus,
  className,
}: {
  subjectStatus: ComAtprotoAdminDefs.SubjectStatusView
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
    text = 'Taken Down'
    color = 'bg-red-200 text-red-800'
  }

  if (
    subjectStatus.muteUntil &&
    new Date(subjectStatus.muteUntil) > new Date()
  ) {
    text = 'Muted'
    color = 'bg-pink-200 text-pink-800'
  }

  return (
    <span
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
  subjectStatus: ComAtprotoAdminDefs.SubjectStatusView
  className?: string
}) => {
  let text =
    reviewStateToText[subjectStatus.reviewState] || subjectStatus.reviewState
  let color =
    reviewStateToColor[subjectStatus.reviewState]?.text || 'text-gray-800'
  let Icon = reviewStateToIcon[subjectStatus.reviewState] || CheckCircleIcon

  if (subjectStatus.takendown) {
    text = 'Taken Down'
    color = 'text-red-800'
    Icon = ShieldExclamationIcon
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
  subjectStatus: ComAtprotoAdminDefs.SubjectStatusView
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
