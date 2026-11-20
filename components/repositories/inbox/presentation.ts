import { ToolsOzoneInboxDefs } from '@atproto/api'
import { isBefore, subYears } from 'date-fns'
import {
  subjectKey,
  type InboxAction,
  type InboxNotification,
  type SubjectRef,
  type ActionedSubjectDetail,
  type ActionedSubject,
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

export function accountActionDate(action: InboxAction) {
  const start = new Date(action.createdAt)
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: isBefore(start, subYears(new Date(), 1)) ? 'numeric' : undefined,
  }
  const end = action.reversedAt ?? action.expiresAt
  return end
    ? `${start.toLocaleDateString(undefined, options)} – ${new Date(end).toLocaleDateString(undefined, options)}`
    : start.toLocaleDateString(undefined, options)
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

/** Copy shown in the app's Your account status, including older-server fallbacks. */
export function accountStatusCopy(data: {
  standing: string
  enforcement?: unknown
  hasActiveStrikes?: unknown
  expiresAt?: unknown
}) {
  if (data.standing !== 'warning' && data.standing !== 'atRisk') return
  const enforcement =
    'enforcement' in data &&
    data.enforcement &&
    typeof data.enforcement === 'object'
      ? data.enforcement
      : undefined
  const state =
    enforcement && 'state' in enforcement ? enforcement.state : undefined
  const knownEnforcement =
    state === 'none' || state === 'suspended' || state === 'takendown'
  const strikes = 'hasActiveStrikes' in data && data.hasActiveStrikes === true
  const takenDown = state === 'takendown'
  const suspended = state === 'suspended'
  const atRisk = data.standing === 'atRisk'
  const title = takenDown
    ? 'Your account has been suspended'
    : suspended
      ? 'Your account is temporarily suspended'
      : atRisk && knownEnforcement
        ? 'Your account is at risk of permanent suspension'
        : atRisk
          ? 'Your account may be suspended or at risk of suspension'
          : strikes
            ? 'Your account has strikes against it'
            : 'Your account has moderation actions'
  const description = takenDown
    ? 'Your account is suspended on Bluesky. See your notices for details and available appeal options.'
    : suspended
      ? 'Your account is temporarily suspended on Bluesky. See your notices for details and available appeal options.'
      : atRisk && knownEnforcement && strikes
        ? 'We’ve taken action on your account for violating our Community Guidelines. Your record now carries enough strikes that another violation could lead to permanent suspension.'
        : atRisk && knownEnforcement
          ? 'Further violations of our Community Guidelines could lead to permanent suspension.'
          : atRisk
            ? 'Your account may already be suspended or at risk of suspension. See your notices for details.'
            : strikes
              ? 'We’ve taken action on your account for violating our Community Guidelines, and strikes have been added to your record. More violations will lead to stronger enforcement, including suspension.'
              : 'We’ve taken action on your account. See your notices for details.'
  const expiryValue =
    suspended && enforcement && 'expiresAt' in enforcement
      ? enforcement.expiresAt
      : !knownEnforcement
        ? data.expiresAt
        : undefined
  const expiry =
    typeof expiryValue === 'string' && Number.isFinite(Date.parse(expiryValue))
      ? expiryValue
      : undefined
  const disclaimer = strikes
    ? takenDown || suspended
      ? 'Your account has strikes against it. Strikes come off your record over time.'
      : 'Some account features may be restricted. Strikes come off your record over time.'
    : !takenDown && !suspended
      ? 'Some account features may be restricted.'
      : undefined
  return {
    title,
    description,
    expiry,
    disclaimer,
    serious: atRisk || takenDown || suspended,
  }
}

/** Account preview fields are optional and may not exist in the installed SDK. */
export function accountPreview(data: unknown) {
  if (!data || typeof data !== 'object' || !('account' in data)) return
  const account = data.account
  if (!account || typeof account !== 'object' || Array.isArray(account)) return
  const handle =
    'handle' in account && typeof account.handle === 'string' && account.handle
      ? account.handle
      : undefined
  const profile = 'profile' in account ? account.profile : undefined
  const name =
    profile &&
    typeof profile === 'object' &&
    '$type' in profile &&
    profile.$type === 'app.bsky.actor.profile' &&
    'displayName' in profile &&
    typeof profile.displayName === 'string' &&
    profile.displayName
      ? profile.displayName
      : undefined
  return { handle, displayName: sanitizeAccountName(name) }
}

export function sanitizeAccountName(name?: string) {
  return name
    ?.replace(/[\u2705\u2713\u2714\u2611]/gu, '')
    .replace(
      /[\u0000-\u001F\u007F-\u009F\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g,
      '',
    )
    .replace(/[\s][\s\u200B]+/g, ' ')
    .trim()
}

/** User-facing account action titles and optional summaries from the app. */
export function accountActionCopy(action: InboxAction, labelName?: string) {
  const policy = action.policies?.[0]?.displayName
  switch (action.type) {
    case 'accountTakedown':
      return { title: 'Your account was suspended', summary: policy }
    case 'accountSuspended': {
      let summary = policy
      if (policy && action.expiresAt) {
        const hours = Math.max(
          0,
          Math.round(
            (Date.parse(action.expiresAt) - Date.parse(action.createdAt)) /
              3_600_000,
          ),
        )
        summary = `${policy} – ${hours} ${hours === 1 ? 'hour' : 'hours'}${Date.parse(action.expiresAt) <= Date.now() ? ', now expired' : ''}`
      }
      return { title: 'Your account was suspended', summary }
    }
    case 'communicationSent':
      return { title: 'An email was sent about your account', summary: policy }
    case 'labelApplied':
      return {
        title: 'A label was added to your account',
        summary: labelName ? `Label: ${labelName}` : undefined,
      }
    case 'labelRemoved':
      return {
        title: 'A label was removed from your account',
        summary: labelName ? `Label: ${labelName}` : undefined,
      }
    case 'reportingRestricted':
      return {
        title: 'Your ability to submit reports was restricted',
        summary: policy,
      }
    case 'credentialsRevoked':
      return { title: 'Your account credentials were revoked', summary: policy }
    case 'accountRestored':
      return { title: 'Your account was restored', summary: undefined }
    default:
      return { title: 'Moderation notice', summary: undefined }
  }
}

export function subjectActionCopy(
  action: InboxAction,
  subject: SubjectRef,
  labelName?: string,
) {
  const key = subjectKey(subject)
  if (!key?.startsWith('at://')) return accountActionCopy(action, labelName)
  const isPost = key.slice(5).split('/')[1] === 'app.bsky.feed.post'
  switch (action.type) {
    case 'contentRemoved':
      return {
        title: isPost ? 'Your post was removed' : 'Your content was removed',
        summary: action.policies?.[0]?.displayName
          ? `Violates Community Guideline: ${action.policies[0].displayName}`
          : undefined,
      }
    case 'contentRestored':
      return {
        title: isPost ? 'Your post was restored' : 'Your content was restored',
        summary: undefined,
      }
    case 'labelApplied':
    case 'labelRemoved':
      return {
        title: `A label was ${action.type === 'labelApplied' ? 'added to' : 'removed from'} your ${isPost ? 'post' : 'content'}`,
        summary: labelName ? `Label: ${labelName}` : undefined,
      }
    default:
      return accountActionCopy(action, labelName)
  }
}

export function accountNoticeTitle(action: InboxAction) {
  if (action.reversedAt) return 'The action against your account was reversed'
  if (action.type === 'accountSuspended' && action.expiresAt) {
    const hours = Math.max(
      0,
      Math.round(
        (Date.parse(action.expiresAt) - Date.parse(action.createdAt)) /
          3_600_000,
      ),
    )
    return `Your account was temporarily suspended for ${hours} ${hours === 1 ? 'hour' : 'hours'}`
  }
  if (action.type === 'labelRemoved') return 'Label removed'
  if (action.type === 'reportingRestricted') return 'Reporting restricted'
  if (action.type === 'credentialsRevoked') return 'Credentials revoked'
  if (action.type === 'accountRestored') return 'Account restored'
  if (
    ![
      'accountSuspended',
      'accountTakedown',
      'labelApplied',
      'communicationSent',
    ].includes(action.type)
  )
    return 'Action taken'
  return accountActionCopy(action).title
}

export function accountSubjectNotice(detail: ActionedSubjectDetail) {
  const action = detail.actions[0]
  const latestDecision = detail.actions.find(isAppealDecision)
  if (detail.appeal?.state === 'pending') {
    return {
      title: 'Appeal under review',
      description: 'Your appeal has been submitted and is awaiting review.',
    }
  }
  if (
    detail.appeal?.state === 'resolved' &&
    (!detail.appeal.resolvedAt ||
      !latestDecision ||
      Date.parse(detail.appeal.resolvedAt) >=
        Date.parse(latestDecision.createdAt))
  ) {
    const outcome = appealOutcome(detail.appeal, 'outcome')
    return outcome === 'approved'
      ? {
          title: 'Appeal approved',
          description:
            'A moderator reviewed your appeal and reversed the original decision.',
        }
      : outcome === 'denied'
        ? {
            title: 'Appeal denied',
            description:
              'We reviewed your appeal and are keeping our original decision in place.',
          }
        : {
            title: 'Appeal resolved',
            description:
              'We reviewed your appeal. The current status of your content or account is shown below.',
          }
  }
  if (detail.enforcement.state === 'takendown') {
    return { title: 'Your account is suspended' }
  }
  if (detail.enforcement.state === 'suspended') {
    return { title: 'Your account is temporarily suspended' }
  }
  return { title: action ? accountNoticeTitle(action) : 'Moderation notice' }
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

export function isAppealDecision(action: InboxAction) {
  return [
    'contentRemoved',
    'accountSuspended',
    'accountTakedown',
    'labelApplied',
  ].includes(action.type)
}

export function isAppealableAction(action: InboxAction) {
  return !action.reversedAt && isAppealDecision(action)
}

export function appealableActionForSubject(
  subject: ActionedSubject | ActionedSubjectDetail,
  actions: InboxAction[],
) {
  if (subjectKey(subject.subject)?.startsWith('did:')) {
    const type =
      subject.enforcement.state === 'takendown'
        ? 'accountTakedown'
        : subject.enforcement.state === 'suspended'
          ? 'accountSuspended'
          : undefined
    if (type)
      return actions.find(
        (action) => action.type === type && !action.reversedAt,
      )
  }
  return actions.find(isAppealableAction)
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
