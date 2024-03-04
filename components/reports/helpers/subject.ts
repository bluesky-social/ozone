import client from '@/lib/client'
import { ComAtprotoAdminDefs } from '@atproto/api'

export const isIdRecord = (id: string) => id.startsWith('at://')

export const createSubjectFromId = async (
  id: string,
): Promise<{
  subject: { $type: string } & ({ uri: string; cid: string } | { did: string })
  record: ComAtprotoAdminDefs.RecordViewDetail | null
}> => {
  if (isIdRecord(id)) {
    try {
      const { data: record } = await client.api.com.atproto.admin.getRecord({
        uri: id,
      })
      return {
        record,
        subject: {
          $type: 'com.atproto.repo.strongRef',
          uri: record.uri,
          cid: record.cid,
        },
      }
    } catch (err) {
      if (err?.['error'] === 'RecordNotFound') {
        // @TODO this is a roundabout way to get a record cid if the record was deleted.
        // It should work pretty well in this context, since createSubjectFromId() is generally used while resolving reports.
        const { data: eventData } =
          await client.api.com.atproto.admin.queryModerationEvents({
            subject: id,
            limit: 1,
          })
        const event = eventData.events.at(0)
        if (!event || event.subject.uri !== id || !event.subject.cid) {
          throw err
        }
        return {
          record: null,
          subject: {
            $type: 'com.atproto.repo.strongRef',
            uri: event.subject.uri,
            cid: `${event.subject.cid}`,
          },
        }
      }
      throw err
    }
  }
  return {
    subject: {
      $type: 'com.atproto.admin.defs#repoRef',
      did: id,
    },
    record: null,
  }
}

export enum CollectionId {
  FeedGenerator = 'app.bsky.feed.generator',
  Profile = 'app.bsky.actor.profile',
  List = 'app.bsky.graph.list',
  Post = 'app.bsky.feed.post',
}
export const getProfileUriForDid = (did: string) =>
  `at://${did}/${CollectionId.Profile}/self`
