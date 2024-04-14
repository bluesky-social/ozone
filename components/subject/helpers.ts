import { ToolsOzoneModerationDefs } from '@atproto/api'

export const isMuted = (
  subjectStatus?: ToolsOzoneModerationDefs.SubjectStatusView | null,
  reportingOnly?: boolean,
) => {
  const field = reportingOnly ? 'muteReportingUntil' : 'muteUntil'
  if (!subjectStatus?.[field]) return false
  return new Date(`${subjectStatus[field]}`) > new Date()
}
