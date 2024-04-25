import { ToolsOzoneModerationDefs } from '@atproto/api'

export const isSubjectMuted = (
  subjectStatus?: ToolsOzoneModerationDefs.SubjectStatusView | null,
) => {
  if (!subjectStatus?.muteUntil) return false
  return new Date(`${subjectStatus.muteUntil}`) > new Date()
}

export const isReporterMuted = (
  subjectStatus?: ToolsOzoneModerationDefs.SubjectStatusView | null,
) => {
  if (!subjectStatus?.muteReportingUntil) return false
  return new Date(`${subjectStatus.muteReportingUntil}`) > new Date()
}
