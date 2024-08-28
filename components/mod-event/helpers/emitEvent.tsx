import Link from 'next/link'
import { toast } from 'react-toastify'
import { ToolsOzoneModerationEmitEvent } from '@atproto/api'
import { useQueryClient } from '@tanstack/react-query'

import { buildItemsSummary, groupSubjects } from '@/workspace/utils'

import { displayError } from '../../common/Loader'
import { MOD_EVENTS } from '@/mod-event/constants'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useCallback } from 'react'
import { useCreateSubjectFromId } from '@/reports/helpers/subject'

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

              const title = `${isRecord ? 'Record' : 'Repo'} was ${
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

export const useActionSubjects = () => {
  const createSubjectFromId = useCreateSubjectFromId()
  const labelerAgent = useLabelerAgent()

  return useCallback(
    async (
      eventData: Pick<ToolsOzoneModerationEmitEvent.InputSchema, 'event'>,
      subjects: string[],
    ) => {
      try {
        const results: { succeeded: string[]; failed: string[] } = {
          succeeded: [],
          failed: [],
        }
        const actions = Promise.allSettled(
          subjects.map(async (sub) => {
            try {
              const { subject } = await createSubjectFromId(sub)
              await labelerAgent.api.tools.ozone.moderation.emitEvent({
                subject,
                createdBy: labelerAgent.assertDid,
                ...eventData,
              })
              results.succeeded.push(sub)
            } catch (err) {
              results.failed.push(sub)
            }
          }),
        )
        await toast.promise(actions, {
          pending: `Taking action on ${buildItemsSummary(
            groupSubjects(subjects),
          )}...`,
          success: {
            render() {
              return results.failed.length
                ? `Actioned ${buildItemsSummary(
                    groupSubjects(results.succeeded),
                  )}. Failed to action ${buildItemsSummary(
                    groupSubjects(results.failed),
                  )}`
                : `Actioned ${buildItemsSummary(
                    groupSubjects(results.succeeded),
                  )}`
            },
          },
        })
      } catch (err) {
        toast.error(`Error taking action: ${displayError(err)}`)
        throw err
      }
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
}
