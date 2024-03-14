import { CollectionId } from '@/reports/helpers/subject'
import {
  AtUri,
  ComAtprotoAdminDefs,
  ComAtprotoRepoStrongRef,
  ToolsOzoneModerationDefs,
} from '@atproto/api'

export const getSubjectTitle = (
  subject: ToolsOzoneModerationDefs.ModEventView['subject'],
) => {
  if (ComAtprotoAdminDefs.isRepoRef(subject)) {
    return 'Account'
  }

  if (ComAtprotoRepoStrongRef.isMain(subject)) {
    const atUri = new AtUri(subject.uri)
    const collection = atUri.collection

    if (collection === CollectionId.Post) {
      return 'Post'
    }
    if (collection === CollectionId.Profile) {
      return 'Profile'
    }
    if (collection === CollectionId.List) {
      return 'List'
    }
  }

  return 'Subject'
}
