import { ToolsOzoneInboxDefs } from '@atproto/api'
import {
  subjectKey,
  type InboxAction,
  type InboxNotification,
  type SubjectRef,
} from './api'

export function readable(value?: string) {
  if (!value) return '—'
  return value
    .replace(/^.*#/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (letter) => letter.toUpperCase())
}

export function date(value?: string, time = false, dayOnly = false) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return time
    ? parsed.toLocaleString()
    : parsed.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        ...(dayOnly ? { timeZone: 'UTC' } : {}),
      })
}

export function enforcementLabel(state: string) {
  return (
    (
      {
        none: 'No active enforcement',
        labeled: 'Labeled',
        removed: 'Content removed',
        suspended: 'Account suspended',
        takendown: 'Account taken down',
      } as Record<string, string>
    )[state] || readable(state)
  )
}

export function scopeLabel(scope?: string) {
  return (
    (
      {
        network: 'Network-wide',
        app: 'This app',
        labelOnly: 'Labels only',
      } as Record<string, string>
    )[scope || ''] || readable(scope)
  )
}

export function standingLabel(standing: string) {
  return (
    (
      { good: 'Good', warning: 'Warning', atRisk: 'At risk' } as Record<
        string,
        string
      >
    )[standing] || readable(standing)
  )
}

// @atproto/api 0.26.0 omits the optional outcome fields introduced in atproto #5642.
// Keep reads on the generated types and validate the extra fields until codegen includes them.
export function appealOutcome(
  value: object,
  field: 'outcome' | 'appealOutcome',
) {
  if (field in value) {
    const outcome: unknown = Reflect.get(value, field)
    if (outcome === 'approved' || outcome === 'denied') return outcome
  }
}

export function appealLabel(appeal: ToolsOzoneInboxDefs.AppealView) {
  const { state } = appeal
  const outcome = appealOutcome(appeal, 'outcome')
  if (state === 'resolved' && outcome) return readable(outcome)
  return (
    (
      {
        pending: 'Under review',
        resolved: 'Reviewed',
        expired: 'Appeal window expired',
        superseded: 'Superseded by a later decision',
        none: 'Not appealed',
      } as Record<string, string>
    )[state] || readable(state)
  )
}

export function isAppealableAction(action: InboxAction) {
  return [
    'contentRemoved',
    'accountSuspended',
    'accountTakedown',
    'labelApplied',
    'labelRemoved',
  ].includes(action.type)
}

export function notificationLabel(notification: InboxNotification) {
  if (
    notification.reason === 'appealResolved' &&
    ToolsOzoneInboxDefs.isSubjectRef(notification.target)
  ) {
    const outcome = appealOutcome(notification.target, 'appealOutcome')
    if (outcome) return `Appeal ${outcome}`
  }
  return (
    (
      {
        reportResolved: 'Report reviewed',
        reportReopened: 'Report reopened',
        actionTaken: 'Moderation action taken',
        actionReversed: 'Moderation action reversed',
        appealResolved: 'Appeal reviewed',
        standingChanged: 'Account standing changed',
      } as Record<string, string>
    )[notification.reason] || readable(notification.reason)
  )
}

export function notificationSubject(
  notification: InboxNotification,
): SubjectRef | undefined {
  return ToolsOzoneInboxDefs.isSubjectRef(notification.target) ||
    ToolsOzoneInboxDefs.isReportRef(notification.target)
    ? notification.target.subject
    : undefined
}

export function notificationHref(did: string, notification: InboxNotification) {
  const base = `/repositories/${encodeURIComponent(did)}/inbox`
  if (ToolsOzoneInboxDefs.isReportRef(notification.target))
    return `${base}/reports?reportId=${notification.target.reportId}`
  if (ToolsOzoneInboxDefs.isSubjectRef(notification.target)) {
    const subject = notification.target.subject
    const key = subjectKey(subject)
    return key
      ? `${base}/actioned-subjects?subject=${encodeURIComponent(key)}`
      : undefined
  }
}

export function mergeActions(pages: { actions: InboxAction[] }[]) {
  const byId = new Map<number, InboxAction>()
  for (const page of pages)
    for (const action of page.actions) byId.set(action.id, action)
  return [...byId.values()].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id,
  )
}

export function countGraphemes(value: string) {
  return [
    ...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(
      value,
    ),
  ].length
}
