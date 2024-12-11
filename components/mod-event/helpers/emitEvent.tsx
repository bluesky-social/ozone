import Link from 'next/link'
import { toast } from 'react-toastify'
import {
  Agent,
  ToolsOzoneModerationDefs,
  ToolsOzoneModerationEmitEvent,
} from '@atproto/api'
import { useQueryClient } from '@tanstack/react-query'

import { buildItemsSummary, groupSubjects } from '@/workspace/utils'

import { displayError } from '../../common/Loader'
import { MOD_EVENTS } from '@/mod-event/constants'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useCallback } from 'react'
import { useCreateSubjectFromId } from '@/reports/helpers/subject'
import { chunkArray } from '@/lib/util'
import {
  WorkspaceListData,
  WorkspaceListItemData,
} from '@/workspace/useWorkspaceListData'
import { compileTemplateContent } from 'components/email/helpers'

export function useEmitEvent() {
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()

  return useCallback(
    async (vals: ToolsOzoneModerationEmitEvent.InputSchema) => {
      const emitModerationEventAsync = async () => {
        const { data } =
          await labelerAgent.api.tools.ozone.moderation.emitEvent(vals)
        return data
      }

      try {
        const isRecord = vals?.subject.$type === 'com.atproto.repo.strongRef'
        await toast.promise(emitModerationEventAsync, {
          pending: 'Taking action...',
          success: {
            render({ data }) {
              const eventId = data?.id
              const eventType = data?.event.$type as string
              const actionTypeString = eventType && eventTexts[eventType]

              const title = `${isRecord ? 'Record' : 'Account'} was ${
                actionTypeString ?? 'actioned'
              }`

              return (
                <div>
                  {title} -{' '}
                  <Link
                    href={`/events/${eventId}`}
                    className="text-indigo-600 hover:text-indigo-900 whitespace-nowrap"
                  >
                    View #{eventId}
                  </Link>
                </div>
              )
            },
          },
        })
        if (!isRecord) {
          // This may not be all encompassing because in the accountView query, the id may be a did or a handle
          queryClient.invalidateQueries([
            'accountView',
            { id: vals?.subject.did },
          ])
        }
      } catch (err) {
        if (err?.['error'] === 'SubjectHasAction') {
          toast.warn(
            'We found that subject already has a current action. You may proceed by resolving with that action, or replacing it.',
          )
        } else {
          toast.error(`Error taking action: ${displayError(err)}`)
        }
        throw err
      }
    },
    [labelerAgent, queryClient],
  )
}

type BulkActionResults = {
  succeeded: string[]
  failed: string[]
}

const eventForSubject = (
  eventData: Pick<ToolsOzoneModerationEmitEvent.InputSchema, 'event'>,
  subjectData: WorkspaceListItemData,
): Pick<ToolsOzoneModerationEmitEvent.InputSchema, 'event'> => {
  // only need to adjust event data for each subject for email events
  // for the rest, same event data is used for all subjects
  if (!ToolsOzoneModerationDefs.isModEventEmail(eventData.event)) {
    return eventData
  }

  if (!eventData.event.content) {
    throw new Error('Email content is required for email events')
  }

  const hasPlaceholder = eventData.event.content.includes('{{handle}}')
  if (!hasPlaceholder) {
    return eventData
  }

  if (!subjectData) {
    throw new Error(
      'Email content has template placeholder but no handle account data found',
    )
  }

  return {
    ...eventData,
    event: {
      ...eventData.event,
      content: compileTemplateContent(eventData.event.content, {
        handle: subjectData.handle,
      }),
    },
  }
}

const emitEventsInBulk = async ({
  labelerAgent,
  createSubjectFromId,
  subjects,
  eventData,
  subjectData,
}: {
  labelerAgent: Agent
  createSubjectFromId: ReturnType<typeof useCreateSubjectFromId>
  subjects: string[]
  eventData: Pick<ToolsOzoneModerationEmitEvent.InputSchema, 'event'>
  subjectData: WorkspaceListData
}) => {
  const toastId = 'workspace-bulk-action'
  try {
    const results: BulkActionResults = {
      succeeded: [],
      failed: [],
    }

    const actions = Promise.allSettled(
      subjects.map(async (sub) => {
        try {
          const { subject } = await createSubjectFromId(sub)
          await labelerAgent.tools.ozone.moderation.emitEvent({
            ...eventForSubject(eventData, subjectData[sub]),
            subject,
            createdBy: labelerAgent.assertDid,
          })
          results.succeeded.push(sub)
        } catch (err) {
          console.error(err)
          results.failed.push(sub)
        }
      }),
    )
    await toast.promise(actions, {
      pending: {
        toastId,
        render: `Taking action on ${buildItemsSummary(
          groupSubjects(subjects),
        )}...`,
      },
      success: {
        toastId,
        render() {
          return results.failed.length
            ? `Actioned ${buildItemsSummary(
                groupSubjects(results.succeeded),
              )}. Failed to action ${buildItemsSummary(
                groupSubjects(results.failed),
              )}. Failed items will remain selected.`
            : `Actioned ${buildItemsSummary(groupSubjects(results.succeeded))}`
        },
      },
    })
    return results
  } catch (err) {
    toast.error(`Error taking action: ${displayError(err)}`, {
      toastId,
    })
    throw err
  }
}

export const useActionSubjects = () => {
  const createSubjectFromId = useCreateSubjectFromId()
  const labelerAgent = useLabelerAgent()

  return useCallback(
    async (
      eventData: Pick<ToolsOzoneModerationEmitEvent.InputSchema, 'event'>,
      subjects: string[],
      subjectData: WorkspaceListData,
    ) => {
      if (!subjects.length) {
        toast.error(`No subject to action`)
        return { succeeded: [], failed: [] }
      }

      const results: BulkActionResults = {
        succeeded: [],
        failed: [],
      }

      for (const chunk of chunkArray(subjects, 50)) {
        const { succeeded, failed } = await emitEventsInBulk({
          labelerAgent,
          createSubjectFromId,
          subjects: chunk,
          eventData,
          subjectData,
        })

        results.succeeded.push(...succeeded)
        results.failed.push(...failed)
        if (subjects.length > 300) {
          // add a delay of 1s between each batch if we are going to be processing more than 6 batches
          // this is kinda arbitrary and not backed by any particular limit but this gives the server a bit of room
          // avoids potential rate limiting
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }

      return results
    },
    [labelerAgent, createSubjectFromId],
  )
}

const eventTexts = {
  [MOD_EVENTS.ACKNOWLEDGE]: 'acknowledged',
  [MOD_EVENTS.ESCALATE]: 'escalated',
  [MOD_EVENTS.TAKEDOWN]: 'taken-down',
  [MOD_EVENTS.COMMENT]: 'commented',
  [MOD_EVENTS.LABEL]: 'labeled',
  [MOD_EVENTS.MUTE]: 'muted',
  [MOD_EVENTS.UNMUTE]: 'unmuted',
  [MOD_EVENTS.APPEAL]: 'appealed',
  [MOD_EVENTS.RESOLVE_APPEAL]: 'appealed',
  [MOD_EVENTS.EMAIL]: 'emailed',
}
