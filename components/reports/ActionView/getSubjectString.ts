import { ToolsOzoneModerationDefs } from '@atproto/api'

export const getSubjectString = (
  subject:
    | ToolsOzoneModerationDefs.RecordView
    | ToolsOzoneModerationDefs.RecordViewNotFound
    | ToolsOzoneModerationDefs.RepoView
    | ToolsOzoneModerationDefs.RepoViewNotFound
    | { [k: string]: unknown; $type: string },
) => {
  if (
    ToolsOzoneModerationDefs.isRecordView(subject) ||
    ToolsOzoneModerationDefs.isRecordViewNotFound(subject)
  ) {
    return subject.uri
  } else if (
    ToolsOzoneModerationDefs.isRepoView(subject) ||
    ToolsOzoneModerationDefs.isRepoViewNotFound(subject)
  ) {
    return subject.did
  }
  return ''
}
