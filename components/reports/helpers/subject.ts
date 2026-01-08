import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { ComAtprotoRepoStrongRef, ToolsOzoneModerationDefs } from '@atproto/api'
import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { WorkspaceListData } from '@/workspace/useWorkspaceListData'

export const isIdRecord = (id: string) => id.startsWith('at://')

export const useCreateSubjectFromId = () => {
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()

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
        // Check if we have this record data in any workspaceListData cache
        const workspaceQueries = queryClient.getQueryCache().findAll({
          queryKey: ['workspaceListData'],
        })

        for (const query of workspaceQueries) {
          const workspaceData = query.state.data as
            | WorkspaceListData
            | undefined
          if (workspaceData?.[id]?.record) {
            const cachedRecord = workspaceData[id].record
            return {
              record: cachedRecord,
              subject: {
                $type: 'com.atproto.repo.strongRef',
                uri: cachedRecord.uri,
                cid: cachedRecord.cid,
              },
            }
          }
        }

        try {
          const { data: record } =
            await labelerAgent.tools.ozone.moderation.getRecord({ uri: id })
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
              await labelerAgent.tools.ozone.moderation.queryEvents({
                subject: id,
                limit: 1,
              })
            const event = eventData.events.at(0)

            if (
              event &&
              ComAtprotoRepoStrongRef.isMain(event.subject) &&
              event.subject.uri === id
            ) {
              return {
                record: null,
                subject: event.subject,
              }
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
  Like = 'app.bsky.feed.like',
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
  if (collection === CollectionId.Like) {
    return 'Like'
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

export const EmbedTypes = {
  Image: 'embed:image',
  Video: 'embed:video',
  External: 'embed:external',
}

export const getEmbedTypeName = (embedType: string) => {
  if (embedType === EmbedTypes.Image) {
    return 'Image'
  }
  if (embedType === EmbedTypes.Video) {
    return 'Video'
  }
  if (embedType === EmbedTypes.External) {
    return 'External'
  }
  if (embedType === 'noEmbed') {
    return 'No Embed'
  }
  return ''
}
