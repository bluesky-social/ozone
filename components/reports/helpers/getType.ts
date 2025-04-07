import { ComAtprotoModerationDefs } from '@atproto/api'

export function getType(obj: unknown): string {
  if (obj && typeof obj['$type'] === 'string') {
    return obj['$type']
  }
  return ''
}

export const reasonTypeOptions = {
  [ComAtprotoModerationDefs.REASONSPAM]: 'Spam',
  [ComAtprotoModerationDefs.REASONVIOLATION]: 'Violation of Terms',
  [ComAtprotoModerationDefs.REASONMISLEADING]: 'Misleading',
  [ComAtprotoModerationDefs.REASONSEXUAL]: 'Sexual',
  [ComAtprotoModerationDefs.REASONRUDE]: 'Rude or Harassment',
  [ComAtprotoModerationDefs.REASONAPPEAL]: 'Appeal',
  [ComAtprotoModerationDefs.REASONOTHER]: 'Other Reason',
}
