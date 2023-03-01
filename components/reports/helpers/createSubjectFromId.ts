import { isIdRecord } from './isIdRecord'

export const createSubjectFromId = (id: string) => {
  const subject = isIdRecord(id)
    ? {
        $type: 'com.atproto.repo.recordRef',
        uri: id,
      }
    : {
        $type: 'com.atproto.repo.repoRef',
        did: id,
      }
  return subject
}
