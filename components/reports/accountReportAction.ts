import { AtUri, ComAtprotoRepoStrongRef } from '@atproto/api'
import type {
  ToolsOzoneModerationEmitEvent,
  ToolsOzoneReportDefs,
} from '@atproto/api'
import { MOD_EVENTS } from '@/mod-event/constants'
import { canTargetAllOwned } from './allOwnedScope'

type ReportAction = ToolsOzoneModerationEmitEvent.ReportAction & {
  allOwned?: boolean
  subjects?: ComAtprotoRepoStrongRef.Main[]
}

const CLOSING_EVENTS = new Set<string>([
  MOD_EVENTS.LABEL,
  MOD_EVENTS.TAKEDOWN,
  MOD_EVENTS.REVERSE_TAKEDOWN,
  MOD_EVENTS.ACKNOWLEDGE,
  MOD_EVENTS.COMMENT,
])

export function canCloseOwnedRecordReport(
  subjectType: string,
  eventType: string,
): boolean {
  return subjectType === 'record' && CLOSING_EVENTS.has(eventType)
}

export function getAccountReportAction({
  report,
  subject,
  eventType,
  scope,
  reportTypes,
}: {
  report: Pick<ToolsOzoneReportDefs.ReportView, 'id' | 'subject' | 'status'>
  subject: ToolsOzoneModerationEmitEvent.InputSchema['subject']
  eventType: string
  scope: 'none' | 'current' | 'all' | 'types' | 'allOwned'
  reportTypes?: string[]
}): ReportAction | undefined {
  if (scope === 'none' || report.status === 'closed') return undefined
  if (!canCloseOwnedRecordReport(report.subject.type, eventType)) {
    throw new Error('This account action cannot close the current report')
  }
  if (
    subject.$type !== 'com.atproto.admin.defs#repoRef' ||
    !('did' in subject) ||
    subject.did !== new AtUri(report.subject.subject).host
  ) {
    throw new Error(
      'The account action must target the reported record’s owner',
    )
  }
  if (scope === 'allOwned') {
    if (!canTargetAllOwned(true, eventType)) {
      throw new Error(
        'Account-wide report closure requires an account label change, takedown, or takedown reversal',
      )
    }
    return { ids: [report.id], allOwned: true }
  }
  if (scope !== 'current' && scope !== 'types') {
    throw new Error('Choose a report closure scope for this account action')
  }
  if (scope === 'types' && reportTypes?.length) {
    const record = report.subject.record
    const statusSubject = report.subject.status?.subject
    const recordSubject =
      record?.uri === report.subject.subject && record.cid
        ? {
            $type: 'com.atproto.repo.strongRef' as const,
            uri: record.uri,
            cid: record.cid,
          }
        : ComAtprotoRepoStrongRef.isMain(statusSubject) &&
            statusSubject.uri === report.subject.subject &&
            statusSubject.cid
          ? statusSubject
          : undefined
    if (!recordSubject) {
      throw new Error(
        'Cannot determine the reported record for closing matching reports',
      )
    }
    return {
      ids: [report.id],
      types: reportTypes,
      subjects: [recordSubject],
    }
  }
  return { ids: [report.id] }
}

export async function submitAccountReportAction({
  input,
  reportActionStarted,
  onSubmit,
  onLinked,
  ...options
}: Omit<
  Parameters<typeof getAccountReportAction>[0],
  'subject' | 'eventType'
> & {
  input: ToolsOzoneModerationEmitEvent.InputSchema
  reportActionStarted: { current: boolean }
  onSubmit: (
    input: ToolsOzoneModerationEmitEvent.InputSchema,
  ) => Promise<number | void>
  onLinked?: () => Promise<void>
}): Promise<void> {
  const reportAction = getAccountReportAction({
    ...options,
    subject: input.subject,
    eventType: input.event.$type,
    scope: reportActionStarted.current ? 'none' : options.scope,
  })
  // Label changes can emit multiple events concurrently. Link only the first
  // so a later event does not try to close the same report again.
  if (reportAction) reportActionStarted.current = true
  try {
    const eventId = await onSubmit({ ...input, reportAction })
    if (reportAction && !eventId) {
      throw new Error(
        'Account action did not return an event ID. Check the account and report before retrying.',
      )
    }
  } catch (err) {
    if (reportAction) reportActionStarted.current = false
    throw err
  }
  if (reportAction) await onLinked?.()
}

export function linksReportToEvent(
  reportId: number,
  reportAction?: ReportAction,
): boolean {
  return !!(reportAction?.allOwned || reportAction?.ids?.includes(reportId))
}
