import type { CustomAction } from './types'

/** Check configured restrictions in both the menu and execution preflight. */
export function scopeError(
  action: CustomAction,
  { moderatorDid, queueId }: { moderatorDid?: string; queueId?: number },
): string | undefined {
  if (
    action.allowedModeratorDids &&
    (!moderatorDid || !action.allowedModeratorDids.includes(moderatorDid))
  )
    return 'This custom action is not available for this moderator'
  if (
    action.queueIds &&
    (queueId === undefined || !action.queueIds.includes(queueId))
  )
    return 'This custom action is not available in the current queue'
}
