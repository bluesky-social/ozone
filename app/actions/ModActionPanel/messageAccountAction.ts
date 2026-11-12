import { parseAtUri } from '@/lib/util'
import { MOD_EVENTS } from '@/mod-event/constants'
import { CollectionId } from '@/reports/helpers/subject'

export function getMessageAccountAction(subject: string, eventType: string) {
  if (parseAtUri(subject)?.collection !== CollectionId.Message) return null

  if (eventType === MOD_EVENTS.LABEL) {
    return 'Labels cannot be applied to messages. This action will label the account.'
  }
  if (eventType === MOD_EVENTS.TAKEDOWN) {
    return 'Messages cannot be taken down. This action will take down the account.'
  }
  if (eventType === MOD_EVENTS.REVERSE_TAKEDOWN) {
    return 'Message takedowns cannot be reversed. This action will reverse the account takedown.'
  }
  return null
}
