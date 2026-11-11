import { useLabelerAgent } from '@/shell/ConfigurationContext'
import {
  ChatBskyConvoDefs,
  ComAtprotoRepoStrongRef,
  ToolsOzoneModerationDefs,
} from '@atproto/api'
import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { WorkspaceListData } from '@/workspace/useWorkspaceListData'
import { parseAtUri } from '@/lib/util'

export const isIdRecord = (id: string) => id.startsWith('at://')

export const useCreateSubjectFromId = () => {
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()

  return useCallback(
    async (
      id: string,
      report?: { subject: string; eventId: number; reportedBy: string },
    ): Promise<{
      subject: { $type: string } & (
        | { uri: string; cid: string }
        | { did: string }
        | { did: string; convoId: string }
        | { did: string; convoId: string; messageId: string }
      )
      record: ToolsOzoneModerationDefs.RecordViewDetail | null
    }> => {
      if (isIdRecord(id)) {
        // Conversations aren't PDS records, so getRecord can't resolve the
        // synthesized at://{did}/chat.bsky.convo/{convoId} id from SubjectOverview.
        const parsed = parseAtUri(id)
        if (
          parsed?.collection === CollectionId.Convo &&
          parsed.did &&
          parsed.rkey
        ) {
          return {
            record: null,
            subject: {
              $type: 'chat.bsky.convo.defs#convoRef',
              did: parsed.did,
              convoId: parsed.rkey,
            },
          }
        }

        if (
          parsed?.collection === CollectionId.Message &&
          parsed.did &&
          parsed.rkey
        ) {
          // The synthetic URI omits the conversation ID. Recover it from the
          // report event instead of treating a chat message as a PDS record.
          const reportHint = report?.subject === id ? report : undefined
          const isMatchingMessage = (
            event: ToolsOzoneModerationDefs.ModEventView,
          ) =>
            (!reportHint || event.id === reportHint.eventId) &&
            ChatBskyConvoDefs.isMessageRef(event.subject) &&
            event.subject.did === parsed.did &&
            event.subject.messageId === parsed.rkey
          // Try the exact URI first, then support servers that cannot filter
          // message events yet. Bound each scan to avoid blocking submission.
          for (const exact of [true, false]) {
            let cursor: string | undefined
            let messageSubject:
              (ChatBskyConvoDefs.MessageRef & { $type: string }) | undefined
            for (let page = 0; page < 10; page++) {
              const { data } =
                await labelerAgent.tools.ozone.moderation.queryEvents({
                  subject: exact ? id : parsed.did,
                  includeAllUserRecords: exact ? undefined : true,
                  createdBy: reportHint?.reportedBy,
                  types: ['tools.ozone.moderation.defs#modEventReport'],
                  limit: 100,
                  cursor,
                })
              for (const event of data.events.filter(isMatchingMessage)) {
                if (!ChatBskyConvoDefs.isMessageRef(event.subject)) continue
                if (
                  messageSubject &&
                  messageSubject.convoId !== event.subject.convoId
                ) {
                  throw new Error('Message belongs to multiple conversations')
                }
                messageSubject = event.subject
                if (reportHint) return { subject: messageSubject, record: null }
              }
              cursor = data.cursor
              if (!cursor) {
                if (messageSubject)
                  return { subject: messageSubject, record: null }
                break
              }
            }
            if (cursor)
              throw new Error('Too many report events to identify this message')
          }
          throw new Error('Could not find the report event for this message')
        }

        // Check if we have this record data in any workspaceListData cache
        const workspaceQueries = queryClient.getQueryCache().findAll({
          queryKey: ['workspaceListData'],
        })

        for (const query of workspaceQueries) {
          const workspaceData = query.state.data as
            WorkspaceListData | undefined
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
    [labelerAgent, queryClient],
  )
}

export enum CollectionId {
  FeedGenerator = 'app.bsky.feed.generator',
  Profile = 'app.bsky.actor.profile',
  List = 'app.bsky.graph.list',
  Post = 'app.bsky.feed.post',
  LabelerService = 'app.bsky.labeler.service',
  StarterPack = 'app.bsky.graph.starterpack',
  ProfileStatus = 'app.bsky.actor.status',
  ProfileLink = 'app.bsky.actor.link',
  SiteStandardDocument = 'site.standard.document',
  SiteStandardPublication = 'site.standard.publication',
  SocialGrainGallery = 'social.grain.gallery',
  SocialGrainPhoto = 'social.grain.photo',
  PlaceStreamLivestream = 'place.stream.livestream',
  Convo = 'chat.bsky.convo',
  Message = 'chat.bsky.convo.message',
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
  if (collection === CollectionId.ProfileStatus) {
    return 'Profile Status'
  }
  if (collection === CollectionId.ProfileLink) {
    return 'Profile Link'
  }
  if (collection === CollectionId.Convo) {
    return 'Conversation'
  }
  if (collection === CollectionId.Message) {
    return 'Message'
  }
  if (collection === CollectionId.SiteStandardDocument) {
    return 'Standard Site Document'
  }
  if (collection === CollectionId.SiteStandardPublication) {
    return 'Standard Site Publication'
  }
  if (collection === CollectionId.SocialGrainGallery) {
    return 'Grain Gallery'
  }
  if (collection === CollectionId.SocialGrainPhoto) {
    return 'Grain Photo'
  }
  if (collection === CollectionId.PlaceStreamLivestream) {
    return 'Livestream'
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
