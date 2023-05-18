import { ComAtprotoAdminDefs } from '@atproto/api'

export const getSubjectString = (
  subject:
    | ComAtprotoAdminDefs.RecordView
    | ComAtprotoAdminDefs.RecordViewNotFound
    | ComAtprotoAdminDefs.RepoView
    | ComAtprotoAdminDefs.RepoViewNotFound
    | { [k: string]: unknown; $type: string },
) => {
  if (
    ComAtprotoAdminDefs.isRecordView(subject) ||
    ComAtprotoAdminDefs.isRecordViewNotFound(subject)
  ) {
    return subject.uri
  } else if (
    ComAtprotoAdminDefs.isRepoView(subject) ||
    ComAtprotoAdminDefs.isRepoViewNotFound(subject)
  ) {
    return subject.did
  }
  return ''
}
