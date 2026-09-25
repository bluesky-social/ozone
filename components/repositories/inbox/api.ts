import type { Agent } from '@atproto/api'

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
  appeal?: { state: string; appealedAt?: string; resolvedAt?: string; note?: string }
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
): Promise<InboxPage<T>> {
  const method =
    kind === 'reports'
      ? 'tools.ozone.inbox.listReports'
      : 'tools.ozone.inbox.listActionedSubjects'
  const field = kind === 'reports' ? 'reports' : 'subjects'
  const params = new URLSearchParams({ did, limit: '50' })
  if (cursor) params.set('cursor', cursor)
  const response = await agent.fetchHandler(`/xrpc/${method}?${params}`, {
    method: 'GET',
    signal,
  })
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
