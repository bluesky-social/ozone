'use client'
import {
  ComAtprotoAdminRecord as AdminRecord,
  ComAtprotoAdminRepo as AdminRepo,
} from '@atproto/api'

export const getSubjectString = (
  subject:
    | AdminRecord.View
    | AdminRepo.View
    | { [k: string]: unknown; $type: string },
) => {
  if (AdminRecord.isView(subject)) {
    return subject.uri
  } else if (AdminRepo.isView(subject)) {
    return subject.did
  }
  return ''
}
