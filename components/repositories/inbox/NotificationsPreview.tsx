'use client'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Loading } from '@/common/Loader'
import { SubjectOverview } from '@/reports/SubjectOverview'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import {
  fetchNotificationPreferences,
  fetchNotificationsPage,
  subjectKey,
  type InboxNotification,
  type NotificationFilters,
} from './api'
import {
  LoadMore,
  PreviewFrame,
  QueryError,
  useHydratedSubjects,
} from './InboxPreview'
import {
  date,
  notificationHref,
  notificationLabel,
  notificationSubject,
  readable,
  standingLabel,
} from './presentation'

export function NotificationsPreview({ did }: { did: string }) {
  const agent = useLabelerAgent()
  const [filters, setFilters] = useState<NotificationFilters>({})
  const enabled = did.startsWith('did:')
  const query = useInfiniteQuery({
    queryKey: ['inboxNotifications', did, filters],
    enabled,
    queryFn: ({ pageParam, signal }) =>
      fetchNotificationsPage(
        agent,
        did,
        filters,
        typeof pageParam === 'string' ? pageParam : undefined,
        signal,
      ),
    getNextPageParam: (page) => page.cursor || undefined,
  })
  const preferences = useQuery({
    queryKey: ['inboxNotificationPreferences', did],
    enabled,
    queryFn: ({ signal }) => fetchNotificationPreferences(agent, did, signal),
  })
  const items = useMemo(() => {
    const byId = new Map<number, InboxNotification>()
    for (const page of query.data?.pages || [])
      for (const item of page.items) byId.set(item.id, item)
    return [...byId.values()]
  }, [query.data])
  const subjects = useMemo(
    () =>
      items.flatMap((item) => {
        const subject = notificationSubject(item)
        return subject ? [{ subject }] : []
      }),
    [items],
  )
  const hydrated = useHydratedSubjects(subjects, did)
  const selectClass =
    'ml-1 rounded-md border-gray-300 bg-white text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100'
  return (
    <PreviewFrame did={did} current="notifications">
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
        <label>
          Section{' '}
          <select
            className={selectClass}
            value={filters.section || ''}
            onChange={(event) =>
              setFilters({
                ...filters,
                section:
                  (event.target.value as NotificationFilters['section']) ||
                  undefined,
              })
            }
          >
            <option value="">All sections</option>
            <option value="reports">Reports</option>
            <option value="subjects">Subjects</option>
            <option value="accountStatus">Account standing</option>
          </select>
        </label>
        <label>
          Reason{' '}
          <select
            className={selectClass}
            value={filters.reason || ''}
            onChange={(event) =>
              setFilters({
                ...filters,
                reason: event.target.value || undefined,
              })
            }
          >
            <option value="">All reasons</option>
            <option value="reportResolved">Report reviewed</option>
            <option value="reportReopened">Report reopened</option>
            <option value="actionTaken">Moderation action taken</option>
            <option value="actionReversed">Moderation action reversed</option>
            <option value="appealResolved">Appeal reviewed</option>
            <option value="standingChanged">Account standing changed</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!filters.unreadOnly}
            onChange={(event) =>
              setFilters({ ...filters, unreadOnly: event.target.checked })
            }
            className="rounded border-gray-300"
          />
          Unread only
        </label>
      </div>
      {enabled && (
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          {preferences.data
            ? `Push notifications: ${preferences.data.push ? 'On' : 'Off'}`
            : preferences.isError
              ? 'Push notification preference unavailable.'
              : 'Loading push notification preference…'}
        </p>
      )}
      {!enabled ? (
        <p className="text-red-600">A DID is required to preview this inbox.</p>
      ) : query.isLoading ? (
        <Loading message="Loading notifications" />
      ) : query.isError && !items.length ? (
        <QueryError error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          {hydrated.isError && (
            <p role="alert" className="mb-3 text-sm text-red-600">
              Could not load some subject content.
            </p>
          )}
          {!items.length && (
            <p className="rounded-lg border border-gray-200 p-4 text-gray-900 dark:border-slate-700 dark:text-gray-100">
              No notifications match these filters.
            </p>
          )}
          <ol className="space-y-2">
            {items.map((item) => {
              const subject = notificationSubject(item)
              const view = subject
                ? hydrated.data?.[subjectKey(subject) || '']
                : undefined
              const href = notificationHref(did, item)
              const target = item.target
              return (
                <li
                  key={item.id}
                  className={`rounded-lg border border-gray-200 p-4 dark:border-slate-700 ${item.isRead ? 'bg-white dark:bg-slate-800' : 'bg-blue-50/50 dark:bg-blue-950/20'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {notificationLabel(item)}
                    </h3>
                    {!item.isRead && (
                      <span
                        className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600"
                        aria-label="Unread"
                      />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {date(item.createdAt, true)}
                  </p>
                  {subject && (
                    <div className="mt-3 overflow-x-auto">
                      <SubjectOverview
                        subject={subject}
                        subjectRepoHandle={
                          view?.record?.repo?.handle || view?.repo?.handle
                        }
                        withTruncation={false}
                      />
                    </div>
                  )}
                  {'reportId' in target && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      Report #{target.reportId}
                      {target.status ? ` · ${readable(target.status)}` : ''}
                    </p>
                  )}
                  {'actionType' in target && target.actionType && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      {readable(target.actionType)}
                    </p>
                  )}
                  {'standing' in target && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      {target.previousStanding
                        ? `${standingLabel(target.previousStanding)} → `
                        : ''}
                      {standingLabel(target.standing)}
                    </p>
                  )}
                  {href && (
                    <Link
                      href={href}
                      className="mt-3 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {'reportId' in target ? 'View report' : 'View subject'} ↗
                    </Link>
                  )}
                </li>
              )
            })}
          </ol>
          {query.isError && (
            <QueryError
              error={query.error}
              retry={() => void query.refetch()}
            />
          )}
          {query.hasNextPage && (
            <div className="mt-6 text-center">
              <LoadMore
                pending={query.isFetchingNextPage}
                onClick={() => void query.fetchNextPage()}
              />
            </div>
          )}
        </>
      )}
    </PreviewFrame>
  )
}
