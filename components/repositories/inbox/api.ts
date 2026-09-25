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
    note?: string
  }
  availableActions?: string[]
  isRead: boolean
  latestAction?: {
    id: number
    type: string
    scope?: string
    createdAt: string
    reversedAt?: string
    expiresAt?: string
    labels?: string[]
  }
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
export type InboxItem = ActionedSubject | InboxReport
export type InboxPage<T> = { cursor?: string; items: T[] }
export type ReportFilter = 'all' | 'pending' | 'resolved' | 'unread'
export type ReportDetail = {
  report: InboxReport
  resolution?: {
    outcome: string
    actionTaken?: string
    scope?: string
    resolvedAt: string
  }
}
export type ActionedSubjectDetail = ActionedSubject & {
  actions: NonNullable<ActionedSubject['latestAction']>[]
  reports?: {
    reasonTypes: string[]
    firstReportedOn: string
    lastReportedOn: string
  }
}

export function subjectKey(subject: SubjectRef): string | undefined {
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
): Promise<T> {
  const method = kind === 'reports' ? 'getReport' : 'getActionedSubject'
  const params = new URLSearchParams({
    did,
    [kind === 'reports' ? 'id' : 'subject']: String(key),
  })
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
): Promise<ActionedSubject> {
  const response = await agent.fetchHandler(
    '/xrpc/tools.ozone.inbox.appealActionedSubject',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subject, reason }),
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
  filter?: ReportFilter,
): Promise<InboxPage<T>> {
  const method =
    kind === 'reports'
      ? 'tools.ozone.inbox.listReports'
      : 'tools.ozone.inbox.listActionedSubjects'
  const field = kind === 'reports' ? 'reports' : 'subjects'
  const params = new URLSearchParams({ did, limit: '50' })
  if (cursor) params.set('cursor', cursor)
  if (kind === 'reports' && filter && filter !== 'all')
    params.set('filter', filter)
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
