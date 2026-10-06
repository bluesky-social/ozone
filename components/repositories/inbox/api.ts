import type { Agent, ToolsOzoneModerationDefs } from '@atproto/api'

export type SubjectRef =
  | { did: string }
  | { uri: string; cid?: string }
  | {
      $type: string
      did?: string
      uri?: string
      cid?: string
      convoId?: string
      messageId?: string
    }

export type ActionedSubject = {
  src: string
  subject: SubjectRef
  enforcement: {
    state: string
    scope?: string
    expiresAt?: string
    labels?: string[]
  }
  appeal?: {
    state: string
    appealedAt?: string
    resolvedAt?: string
    appealableUntil?: string
  }
  availableActions?: string[]
  isRead: boolean
  latestAction?: InboxAction
  actionCount?: number
  createdAt: string
  updatedAt: string
}

export type InboxReport = {
  src: string
  id: number
  isRead: boolean
  reasonType: string
  reason?: string
  lastActionTaken?: string
  scope?: string
  subject: SubjectRef
  status: string
  createdAt: string
  updatedAt: string
}

export type InboxKind = 'actioned-subjects' | 'reports'
export type InboxSection = InboxKind | 'notifications'
export type InboxItem = ActionedSubject | InboxReport
export type InboxPage<T> = { cursor?: string; items: T[] }
export type InboxFilter = 'all' | 'pending' | 'resolved' | 'unread'
export type ReportFilter = InboxFilter
export type InboxSort = {
  sortField: 'createdAt' | 'updatedAt'
  sortDirection: 'asc' | 'desc'
}
export type InboxAction = {
  id: number
  type: string
  scope?: string
  createdAt: string
  reversedAt?: string
  expiresAt?: string
  labels?: string[]
  policies?: { key: string; displayName: string; link: string }[]
}
export type ReportDetail = {
  report: Omit<InboxReport, 'isRead' | 'lastActionTaken' | 'scope'> & {
    record?: unknown
  }
  resolution?: {
    outcome: string
    actionTaken?: string
    scope?: string
    resolvedAt: string
  }
}
export type ActionedSubjectDetail = Omit<
  ActionedSubject,
  'latestAction' | 'actionCount'
> & {
  record?: unknown
  cursor?: string
  actions: InboxAction[]
  reports?: {
    reasonTypes: string[]
    firstReportedOn: string
    lastReportedOn: string
  }
}

export type AccountStatus = {
  src: string
  standing: string
  updatedAt: string
  expiresAt?: string
}
export type UnreadCounts = {
  total: number
  reports?: number
  subjects?: number
  accountStatus?: number
}
export type NotificationTarget =
  | {
      $type: 'tools.ozone.inbox.defs#reportRef'
      reportId: number
      subject?: SubjectRef
      status?: string
    }
  | {
      $type: 'tools.ozone.inbox.defs#subjectRef'
      subject: SubjectRef
      actionType?: string
      actionId?: number
    }
  | {
      $type: 'tools.ozone.inbox.defs#standingRef'
      standing: string
      previousStanding?: string
    }
export type InboxNotification = {
  id: number
  reason: string
  target: NotificationTarget
  isRead: boolean
  createdAt: string
}
export type NotificationFilters = {
  section?: 'reports' | 'subjects' | 'accountStatus'
  reason?: string
  unreadOnly?: boolean
}

export function subjectKey(subject: SubjectRef): string | undefined {
  if ('messageId' in subject || 'convoId' in subject) return undefined
  if ('uri' in subject && subject.uri) return subject.uri
  if ('did' in subject && subject.did) return subject.did
}

/** Get each page's unique account and record subjects, respecting the endpoint's batch size. */
export async function hydrateInboxSubjects(
  agent: Pick<Agent, 'tools'>,
  items: { subject: SubjectRef }[],
): Promise<Record<string, ToolsOzoneModerationDefs.SubjectView>> {
  const keys = [
    ...new Set(
      items
        .map((item) => subjectKey(item.subject))
        .filter((key): key is string => !!key),
    ),
  ]
  const views: Record<string, ToolsOzoneModerationDefs.SubjectView> = {}
  for (let index = 0; index < keys.length; index += 50) {
    const { data } = await agent.tools.ozone.moderation.getSubjects({
      subjects: keys.slice(index, index + 50),
    })
    for (const view of data.subjects) views[view.subject] = view
  }
  return views
}

async function readResponse<T>(response: Response): Promise<T> {
  const data: unknown = await response.json()
  if (!response.ok) {
    const message =
      data &&
      typeof data === 'object' &&
      'message' in data &&
      typeof data.message === 'string'
        ? data.message
        : `Inbox request failed (${response.status})`
    throw new Error(message)
  }
  return data as T
}

export async function fetchInboxDetail<
  T extends ReportDetail | ActionedSubjectDetail,
>(
  agent: Pick<Agent, 'fetchHandler'>,
  did: string,
  kind: InboxKind,
  key: string | number,
  signal?: AbortSignal,
  cursor?: string,
): Promise<T> {
  const method = kind === 'reports' ? 'getReport' : 'getActionedSubject'
  const params = new URLSearchParams({
    did,
    [kind === 'reports' ? 'id' : 'subject']: String(key),
  })
  if (kind === 'actioned-subjects') {
    params.set('limit', '50')
    if (cursor) params.set('cursor', cursor)
  }
  const response = await agent.fetchHandler(
    `/xrpc/tools.ozone.inbox.${method}?${params}`,
    { method: 'GET', signal },
  )
  return readResponse<T>(response)
}

export async function submitInboxAppeal(
  agent: Pick<Agent, 'fetchHandler'>,
  subject: SubjectRef,
  reason: string,
  actionId?: number,
): Promise<ActionedSubject> {
  const response = await agent.fetchHandler(
    '/xrpc/tools.ozone.inbox.appealActionedSubject',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        subject,
        ...(reason ? { reason } : {}),
        ...(actionId
          ? {
              action: {
                $type: 'tools.ozone.inbox.appealActionedSubject#actionRef',
                id: actionId,
              },
            }
          : {}),
      }),
    },
  )
  return readResponse<ActionedSubject>(response)
}

/**
 * The released @atproto/api does not include these NSIDs yet. Agent.call
 * rejects unknown lexicons, while fetchHandler retains the logged-in session
 * and labeler's atproto-proxy header without requiring generated types.
 */
export async function fetchInboxPreviewPage<T extends InboxItem>(
  agent: Pick<Agent, 'fetchHandler'>,
  did: string,
  kind: InboxKind,
  cursor?: string,
  signal?: AbortSignal,
  filter?: InboxFilter,
  sort?: InboxSort,
): Promise<InboxPage<T>> {
  const method =
    kind === 'reports'
      ? 'tools.ozone.inbox.listReports'
      : 'tools.ozone.inbox.listActionedSubjects'
  const field = kind === 'reports' ? 'reports' : 'subjects'
  const params = new URLSearchParams({ did, limit: '50' })
  if (cursor) params.set('cursor', cursor)
  if (filter && filter !== 'all') params.set('filter', filter)
  if (sort) {
    params.set('sortField', sort.sortField)
    params.set('sortDirection', sort.sortDirection)
  }
  const response = await agent.fetchHandler(`/xrpc/${method}?${params}`, {
    method: 'GET',
    signal,
  })
  const data: unknown = await readResponse(response)
  if (!data || typeof data !== 'object' || !(field in data)) {
    throw new Error('The inbox returned an unexpected response.')
  }
  const items = data[field]
  if (!Array.isArray(items)) {
    throw new Error('The inbox returned an unexpected response.')
  }
  return {
    cursor:
      'cursor' in data && typeof data.cursor === 'string'
        ? data.cursor
        : undefined,
    items: items as T[],
  }
}

async function fetchPreviewRead<T>(
  agent: Pick<Agent, 'fetchHandler'>,
  did: string,
  method: string,
  signal?: AbortSignal,
  params = new URLSearchParams(),
): Promise<T> {
  params.set('did', did)
  return readResponse<T>(
    await agent.fetchHandler(`/xrpc/tools.ozone.inbox.${method}?${params}`, {
      method: 'GET',
      signal,
    }),
  )
}

export function fetchAccountStatus(
  agent: Pick<Agent, 'fetchHandler'>,
  did: string,
  signal?: AbortSignal,
) {
  return fetchPreviewRead<AccountStatus>(agent, did, 'getAccountStatus', signal)
}

export async function fetchUnreadCounts(
  agent: Pick<Agent, 'fetchHandler'>,
  did: string,
  signal?: AbortSignal,
) {
  return (
    await fetchPreviewRead<{ unreadCounts: UnreadCounts }>(
      agent,
      did,
      'getUnreadCount',
      signal,
    )
  ).unreadCounts
}

export async function fetchNotificationPreferences(
  agent: Pick<Agent, 'fetchHandler'>,
  did: string,
  signal?: AbortSignal,
) {
  return (
    await fetchPreviewRead<{ preferences: { push: boolean } }>(
      agent,
      did,
      'getNotificationPreferences',
      signal,
    )
  ).preferences
}

export async function fetchNotificationsPage(
  agent: Pick<Agent, 'fetchHandler'>,
  did: string,
  filters: NotificationFilters = {},
  cursor?: string,
  signal?: AbortSignal,
): Promise<InboxPage<InboxNotification>> {
  const params = new URLSearchParams({ limit: '50' })
  if (cursor) params.set('cursor', cursor)
  if (filters.section) params.set('section', filters.section)
  if (filters.reason) params.append('reasons', filters.reason)
  if (filters.unreadOnly) params.set('unreadOnly', 'true')
  const data = await fetchPreviewRead<{
    notifications: InboxNotification[]
    cursor?: string
  }>(agent, did, 'listNotifications', signal, params)
  if (!Array.isArray(data.notifications))
    throw new Error('The inbox returned an unexpected response.')
  return { items: data.notifications, cursor: data.cursor }
}
