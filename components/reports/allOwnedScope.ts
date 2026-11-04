import { MOD_EVENTS } from '@/mod-event/constants'

export function canTargetAllOwned(
  supported: boolean,
  isAccount: boolean,
  eventType?: string,
): boolean {
  return (
    supported &&
    isAccount &&
    (eventType === MOD_EVENTS.LABEL ||
      eventType === MOD_EVENTS.TAKEDOWN ||
      eventType === MOD_EVENTS.REVERSE_TAKEDOWN)
  )
}
