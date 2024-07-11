import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { ToolsOzoneModerationDefs } from '@atproto/api'
import { useCallback } from 'react'

export const isIdRecord = (id: string) => id.startsWith('at://')

export const useCreateSubjectFromId = () => {
  const labelerAgent = useLabelerAgent()

  return useCallback(
    async (
      id: string,
    ): Promise<{
      subject: { $type: string } & (
        | { uri: string; cid: string }
        | { did: string }
      )
      record: ToolsOzoneModerationDefs.RecordViewDetail | null
    }> => {
      if (isIdRecord(id)) {
        try {
          const { data: record } =
            await labelerAgent.api.tools.ozone.moderation.getRecord({ uri: id })
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
              await labelerAgent.api.tools.ozone.moderation.queryEvents({
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
    },
    [labelerAgent],
  )
}

export enum CollectionId {
  FeedGenerator = 'app.bsky.feed.generator',
  Profile = 'app.bsky.actor.profile',
  List = 'app.bsky.graph.list',
  Post = 'app.bsky.feed.post',
  LabelerService = 'app.bsky.labeler.service',
  StarterPack = 'app.bsky.graph.starterpack',
}
export const getProfileUriForDid = (did: string) =>
  `at://${did}/${CollectionId.Profile}/self`

export const getCollectionName = (collection: string) => {
  if (collection === CollectionId.Post) {
    return 'Post'
  }
  if (collection === CollectionId.Profile) {
    return 'Profile'
  }
  if (collection === CollectionId.List) {
    return 'List'
  }
  if (collection === CollectionId.FeedGenerator) {
    return 'Feed'
  }
  if (collection === CollectionId.LabelerService) {
    return 'Labeler'
  }
  if (collection === CollectionId.StarterPack) {
    return 'Starter Pack'
  }
  // If the collection is a string with ., use the last two segments as the title
  // so app.bsky.graph.list -> graph list
  if (collection.includes('.')) {
    return collection.split('.').slice(-2).join(' ')
  }
  return ''
}
