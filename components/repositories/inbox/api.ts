import {
  ComAtprotoAdminDefs,
  ComAtprotoRepoStrongRef,
  type Agent,
  type ToolsOzoneInboxDefs,
  type ToolsOzoneInboxGetAccountStatus,
  type ToolsOzoneInboxGetReport,
  type ToolsOzoneInboxListNotifications,
  type ToolsOzoneInboxListReports,
} from '@atproto/api'
import type { ToolsOzoneModerationDefs } from '@atproto/api'

export type ActionedSubject = ToolsOzoneInboxDefs.SubjectView
export type InboxReport = ToolsOzoneInboxListReports.ReportView
export type SubjectRef = InboxReport['subject']
export type InboxAction = ToolsOzoneInboxDefs.ActionView
export type ReportDetail = ToolsOzoneInboxGetReport.OutputSchema
export type ActionedSubjectDetail = ToolsOzoneInboxDefs.SubjectViewDetail
export type InboxNotification = ToolsOzoneInboxDefs.Notification

export type InboxKind = 'actioned-subjects' | 'reports'
export type InboxSection = InboxKind | 'notifications'
export type InboxItem = ActionedSubject | InboxReport
export type InboxPage<T> = { cursor?: string; items: T[] }
export type InboxFilter = NonNullable<
  ToolsOzoneInboxListReports.QueryParams['filter']
>
export type ReportFilter = InboxFilter
export type InboxSort = Required<
  Pick<ToolsOzoneInboxListReports.QueryParams, 'sortField' | 'sortDirection'>
>
export type NotificationFilters = Pick<
  ToolsOzoneInboxListNotifications.QueryParams,
  'section' | 'unreadOnly'
> & { reason?: InboxNotification['reason'] }

type InboxAgent = Pick<Agent, 'tools'>
type InboxItemFor<K extends InboxKind> = K extends 'reports'
  ? InboxReport
  : ActionedSubject
type InboxDetailFor<K extends InboxKind> = K extends 'reports'
  ? ReportDetail
  : ActionedSubjectDetail

export function subjectKey(subject: SubjectRef): string | undefined {
  if (ComAtprotoRepoStrongRef.isMain(subject)) return subject.uri
  if (ComAtprotoAdminDefs.isRepoRef(subject)) return subject.did
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

export async function fetchInboxDetail<K extends InboxKind>(
  agent: InboxAgent,
  did: string,
  kind: K,
  key: string | number,
  signal?: AbortSignal,
  cursor?: string,
): Promise<InboxDetailFor<K>> {
  const inbox = agent.tools.ozone.inbox
  const { data } =
    kind === 'reports'
      ? await inbox.getReport({ did, id: Number(key) }, { signal })
      : await inbox.getActionedSubject(
          { did, subject: String(key), limit: 50, cursor },
          { signal },
        )
  return data as InboxDetailFor<K>
}

export async function submitInboxAppeal(
  agent: InboxAgent,
  subject: SubjectRef,
  reason: string,
  actionId?: number,
): Promise<ActionedSubject> {
  const { data } = await agent.tools.ozone.inbox.appealActionedSubject({
    subject,
    ...(reason ? { reason } : {}),
    ...(actionId !== undefined
      ? {
          action: {
            $type: 'tools.ozone.inbox.appealActionedSubject#actionRef',
            id: actionId,
          },
        }
      : {}),
  })
  return data
}

export async function fetchInboxPreviewPage<K extends InboxKind>(
  agent: InboxAgent,
  did: string,
  kind: K,
  cursor?: string,
  signal?: AbortSignal,
  filter?: InboxFilter,
  sort?: InboxSort,
): Promise<InboxPage<InboxItemFor<K>>> {
  const params = {
    did,
    limit: 50,
    cursor,
    filter: filter === 'all' ? undefined : filter,
    ...sort,
  }
  const inbox = agent.tools.ozone.inbox
  if (kind === 'reports') {
    const { data } = await inbox.listReports(params, { signal })
    return { cursor: data.cursor, items: data.reports as InboxItemFor<K>[] }
  }
  const { data } = await inbox.listActionedSubjects(params, { signal })
  return { cursor: data.cursor, items: data.subjects as InboxItemFor<K>[] }
}

export async function fetchAccountStatus(
  agent: InboxAgent,
  did: string,
  signal?: AbortSignal,
): Promise<ToolsOzoneInboxGetAccountStatus.OutputSchema> {
  const { data } = await agent.tools.ozone.inbox.getAccountStatus(
    { did },
    { signal },
  )
  return data
}

export async function fetchUnreadCounts(
  agent: InboxAgent,
  did: string,
  signal?: AbortSignal,
) {
  const { data } = await agent.tools.ozone.inbox.getUnreadCount(
    { did },
    { signal },
  )
  return data.unreadCounts
}

export async function fetchNotificationPreferences(
  agent: InboxAgent,
  did: string,
  signal?: AbortSignal,
) {
  const { data } = await agent.tools.ozone.inbox.getNotificationPreferences(
    { did },
    { signal },
  )
  return data.preferences
}

export async function fetchNotificationsPage(
  agent: InboxAgent,
  did: string,
  filters: NotificationFilters = {},
  cursor?: string,
  signal?: AbortSignal,
): Promise<InboxPage<InboxNotification>> {
  const { data } = await agent.tools.ozone.inbox.listNotifications(
    {
      did,
      limit: 50,
      cursor,
      section: filters.section,
      reasons: filters.reason ? [filters.reason] : undefined,
      unreadOnly: filters.unreadOnly || undefined,
    },
    { signal },
  )
  return { items: data.notifications, cursor: data.cursor }
}
