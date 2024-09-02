import { ToolsOzoneModerationDefs } from '@atproto/api'

export const isSubjectMuted = (
  subjectStatus?: ToolsOzoneModerationDefs.SubjectStatusView | null,
) => {
  if (!subjectStatus?.muteUntil) return false
  return new Date(subjectStatus.muteUntil) > new Date()
}

export const isReporterMuted = (
  subjectStatus?: ToolsOzoneModerationDefs.SubjectStatusView | null,
) => {
  if (!subjectStatus?.muteReportingUntil) return false
  return new Date(subjectStatus.muteReportingUntil) > new Date()
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export const getLastReviewedAt = (
  subjectStatus: ToolsOzoneModerationDefs.SubjectStatusView,
) => {
  return subjectStatus?.lastReviewedAt
    ? dateFormatter.format(new Date(subjectStatus.lastReviewedAt))
    : ''
}
