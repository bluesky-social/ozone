import { ComAtprotoAdminDefs } from '@atproto/api'

export const getSubjectString = (
  subject:
    | ComAtprotoAdminDefs.RecordView
    | ComAtprotoAdminDefs.RepoView
    | { [k: string]: unknown; $type: string },
) => {
  if (ComAtprotoAdminDefs.isRecordView(subject)) {
    return subject.uri
  } else if (ComAtprotoAdminDefs.isRepoView(subject)) {
    return subject.did
  }
  return ''
}
