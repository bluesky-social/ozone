import { isIdRecord } from './isIdRecord'
import client from '../../../lib/client'

export const createSubjectFromId = async (id: string) => {
  if (isIdRecord(id)) {
    const { data: record } = await client.api.com.atproto.admin.getRecord(
      { uri: id },
      { headers: client.adminHeaders() },
    )
    return {
      $type: 'com.atproto.repo.strongRef',
      uri: record.uri,
      cid: record.cid,
    }
  }
  return {
    $type: 'com.atproto.admin.defs#repoRef',
    did: id,
  }
}
