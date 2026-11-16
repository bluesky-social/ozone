import type { CustomAction } from './types'

/** Check configured restrictions in both the menu and execution preflight. */
export function scopeError(
  action: CustomAction,
  {
    moderatorDid,
    queueId,
    reportType,
  }: { moderatorDid?: string; queueId?: number; reportType?: string },
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
  if (
    action.reportTypes &&
    (reportType === undefined || !action.reportTypes.includes(reportType))
  )
    return 'This custom action is not available for the current report type'
}
