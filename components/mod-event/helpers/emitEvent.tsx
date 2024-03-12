import Link from 'next/link'
import { toast } from 'react-toastify'
import client from '@/lib/client'
import { displayError } from '../../common/Loader'
import { queryClient } from 'components/QueryClient'
import { MOD_EVENTS } from '@/mod-event/constants'
import { ToolsOzoneModerationEmitEvent } from '@atproto/api'

export const emitEvent = async (
  vals: ToolsOzoneModerationEmitEvent.InputSchema,
) => {
  const emitModerationEventAsync = async () => {
    const { data } = await client.api.tools.ozone.moderation.emitEvent(
      vals,
      { encoding: 'application/json', headers: client.proxyHeaders() },
    )

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
      queryClient.invalidateQueries(['accountView', { id: vals?.subject.did }])
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
}

const eventTexts = {
  [MOD_EVENTS.ACKNOWLEDGE]: 'acknowledged',
  [MOD_EVENTS.ESCALATE]: 'escalated',
  [MOD_EVENTS.TAKEDOWN]: 'taken-down',
  [MOD_EVENTS.COMMENT]: 'commented',
  [MOD_EVENTS.LABEL]: 'labeled',
}
