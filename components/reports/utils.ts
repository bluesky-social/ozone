import { ToolsOzoneModerationDefs } from '@atproto/api'

export const getHandleFromSubjectView = (
  sv: ToolsOzoneModerationDefs.SubjectView,
): string | undefined =>
  sv.status?.subjectRepoHandle ??
  sv.repo?.handle ??
  sv.record?.repo?.handle
