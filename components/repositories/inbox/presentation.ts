import type { InboxAction, InboxNotification, SubjectRef } from './api'

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

export function appealLabel(state: string) {
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
  return 'subject' in notification.target
    ? notification.target.subject
    : undefined
}

export function notificationHref(did: string, notification: InboxNotification) {
  const base = `/repositories/${encodeURIComponent(did)}/inbox`
  if ('reportId' in notification.target)
    return `${base}/reports?reportId=${notification.target.reportId}`
  if ('subject' in notification.target) {
    const subject = notification.target.subject
    const key =
      subject &&
      ('uri' in subject
        ? subject.uri
        : 'did' in subject
          ? subject.did
          : undefined)
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
