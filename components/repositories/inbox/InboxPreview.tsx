'use client'

import type { ToolsOzoneModerationDefs } from '@atproto/api'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  BellIcon,
  ShieldCheckIcon,
} from '@heroicons/react/20/solid'
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { ButtonGroup } from '@/common/buttons'
import { Loading, LoadingFailed } from '@/common/Loader'
import { ReasonBadge } from '@/reports/ReasonBadge'
import { SubjectOverview } from '@/reports/SubjectOverview'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import {
  ActionedSubject,
  ActionedSubjectDetail,
  fetchInboxDetail,
  InboxReport,
  ReportDetail,
  SubjectRef,
  subjectKey,
  hydrateInboxSubjects,
  submitInboxAppeal,
  type InboxFilter,
  type InboxSort,
  type InboxSection,
  type InboxAction,
} from './api'
import { useInboxPreview } from './useInboxPreview'
import { InboxSummary } from './InboxSummary'
import {
  date,
  readable,
  enforcementLabel,
  scopeLabel,
  appealLabel,
  isAppealableAction,
  mergeActions,
  countGraphemes,
} from './presentation'

type Hydrated = Record<string, ToolsOzoneModerationDefs.SubjectView>
const cardClass =
  'rounded-lg border border-gray-200 bg-gray-50 p-4 text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100'
const linkClass = 'text-blue-600 hover:underline dark:text-blue-400'

function recordKind(uri: string) {
  const collection = uri.slice(5).split('/')[1]
  return (
    (
      {
        'app.bsky.feed.post': 'Post',
        'app.bsky.graph.list': 'List',
        'app.bsky.feed.generator': 'Feed',
        'app.bsky.graph.starterpack': 'Starter pack',
      } as Record<string, string>
    )[collection] || 'Record'
  )
}

function subjectTitle(
  subject: SubjectRef,
  hydrated?: ToolsOzoneModerationDefs.SubjectView,
) {
  const key = subjectKey(subject)
  if (key?.startsWith('did:'))
    return `Account @${hydrated?.repo?.handle || key}`
  if (key?.startsWith('at://')) {
    const kind = recordKind(key)
    const value = hydrated?.record?.value
    const name =
      typeof value?.name === 'string'
        ? value.name
        : typeof value?.displayName === 'string'
          ? value.displayName
          : undefined
    return name
      ? `${kind} “${name}”`
      : `${kind} by @${hydrated?.record?.repo?.handle || key.slice(5).split('/')[0]}`
  }
  if ('messageId' in subject && subject.messageId) return 'Direct message'
  if ('convoId' in subject && subject.convoId) return 'Conversation'
  return 'Subject unavailable'
}

function SubjectContent({
  subject,
  hydrated,
  record,
}: {
  subject: SubjectRef
  hydrated?: ToolsOzoneModerationDefs.SubjectView
  record?: unknown
}) {
  const key = subjectKey(subject)
  const value =
    record && typeof record === 'object' && !Array.isArray(record)
      ? (record as Record<string, unknown>)
      : hydrated?.record?.value
  const description =
    typeof value?.text === 'string'
      ? value.text
      : typeof value?.description === 'string'
        ? value.description
        : undefined
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      {key ? (
        <SubjectOverview
          subject={subject}
          subjectRepoHandle={
            hydrated?.record?.repo?.handle || hydrated?.repo?.handle
          }
          withTruncation={false}
        />
      ) : (
        <p className="font-medium text-gray-900 dark:text-gray-100">
          {subjectTitle(subject, hydrated)}
        </p>
      )}
      {typeof value?.name === 'string' && (
        <p className="mt-2 font-medium text-gray-900 dark:text-gray-100">
          {value.name}
        </p>
      )}
      {description && (
        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-300">
          {description}
        </p>
      )}
      {hydrated?.record && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Posted {date(hydrated.record.indexedAt)}
        </p>
      )}
      {!hydrated && !value && key && (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Content unavailable or removed
        </p>
      )}
      {record !== undefined && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-gray-500 dark:text-gray-400">
            Record data
          </summary>
          <pre className="mt-2 max-h-80 overflow-auto rounded bg-gray-50 p-3 text-xs dark:bg-slate-900">
            {JSON.stringify(record, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}

function Timeline({ events }: { events: { label: string; at?: string }[] }) {
  return (
    <section className={cardClass}>
      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
        Timeline
      </h3>
      <ol className="mt-3 space-y-3 border-l-2 border-gray-200 pl-4 dark:border-slate-700">
        {events
          .slice()
          .sort(
            (a, b) =>
              (a.at ? Date.parse(a.at) : Infinity) -
              (b.at ? Date.parse(b.at) : Infinity),
          )
          .map((event, index) => (
            <li
              key={`${event.label}-${index}`}
              className="relative text-sm text-gray-800 dark:text-gray-200"
            >
              <span className="absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-white dark:ring-slate-900" />
              <span className="font-medium">{event.label}</span>
              {event.at && (
                <span className="ml-2 text-gray-500 dark:text-gray-400">
                  {date(event.at, true)}
                </span>
              )}
            </li>
          ))}
      </ol>
    </section>
  )
}

export function useHydratedSubjects(
  items: { subject: SubjectRef }[],
  did: string,
) {
  const agent = useLabelerAgent()
  const keys = useMemo(
    () =>
      [
        ...new Set(
          [...items, { subject: { did } }]
            .map((item) => subjectKey(item.subject))
            .filter((key): key is string => !!key),
        ),
      ].sort(),
    [items, did],
  )
  return useQuery<Hydrated>({
    queryKey: ['inboxSubjectHydration', keys],
    enabled: keys.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      return hydrateInboxSubjects(agent, [...items, { subject: { did } }])
    },
  })
}

export function Row({
  title,
  subtitle,
  isRead,
  open,
  onToggle,
  children,
}: {
  title: string
  subtitle: React.ReactNode
  isRead?: boolean
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className={`flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-gray-50 dark:hover:bg-slate-700 ${isRead === false ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </span>
          <span className="mt-1 block text-sm text-gray-600 dark:text-gray-300">
            {subtitle}
          </span>
        </span>
        {isRead === false && (
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600"
            aria-label="Unread"
          />
        )}
        {open ? (
          <ChevronDownIcon className="h-5 w-5 shrink-0 text-gray-500" />
        ) : (
          <ChevronRightIcon className="h-5 w-5 shrink-0 text-gray-500" />
        )}
      </button>
      {open && (
        <div className="space-y-4 border-t border-gray-200 p-4 dark:border-slate-700">
          {children}
        </div>
      )}
    </article>
  )
}

export function ReportRow({
  item,
  did,
  hydrated,
  reporterHandle,
  selected = false,
}: {
  item: Omit<InboxReport, 'isRead'> & { isRead?: boolean }
  did: string
  hydrated?: ToolsOzoneModerationDefs.SubjectView
  reporterHandle?: string
  selected?: boolean
}) {
  const [open, setOpen] = useState(selected)
  useEffect(() => {
    if (selected) setOpen(true)
  }, [selected])
  const agent = useLabelerAgent()
  const detail = useQuery<ReportDetail, Error>({
    queryKey: ['inboxReportDetail', did, item.id],
    enabled: open,
    staleTime: 15_000,
    queryFn: ({ signal }) =>
      fetchInboxDetail(agent, did, 'reports', item.id, signal),
  })
  const report = detail.data?.report || item
  const resolution = detail.data?.resolution
  const actionTaken =
    report.status === 'resolved'
      ? detail.data
        ? resolution?.actionTaken
        : item.lastActionTaken
      : undefined
  const status =
    report.status === 'pending'
      ? 'Awaiting review'
      : resolution?.outcome === 'noAction'
        ? 'No action taken'
        : actionTaken
          ? readable(actionTaken)
          : 'Reviewed'
  return (
    <Row
      title={subjectTitle(item.subject, hydrated)}
      subtitle={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <ReasonBadge reasonType={item.reasonType} />
          <span>
            {status} · Updated {date(report.updatedAt)}
          </span>
        </span>
      }
      isRead={item.isRead}
      open={open}
      onToggle={() => setOpen(!open)}
    >
      {detail.isLoading && <Loading message="Loading report details" />}
      {detail.isError && (
        <QueryError error={detail.error} retry={() => void detail.refetch()} />
      )}
      <section className={cardClass}>
        <h3 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">
          What was reported
        </h3>
        <SubjectContent
          subject={report.subject}
          hydrated={hydrated}
          record={detail.data?.report.record}
        />
        {report.reason && (
          <div className="mt-4 text-sm">
            <h4 className="text-gray-500 dark:text-gray-400">
              Reporter’s note
            </h4>
            <p className="whitespace-pre-wrap break-words">{report.reason}</p>
          </div>
        )}
      </section>
      {resolution && (
        <section className={cardClass}>
          <h3 className="font-semibold">Report resolution</h3>
          <p className="mt-2 text-sm">{status}</p>
          {resolution.scope && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Scope: {scopeLabel(resolution.scope)}
            </p>
          )}
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Reviewed {date(resolution.resolvedAt, true)}
          </p>
        </section>
      )}
      <Timeline
        events={[
          { label: 'Report submitted', at: report.createdAt },
          ...(report.status === 'pending'
            ? [{ label: 'Awaiting review' }]
            : [
                {
                  label: status,
                  at: resolution?.resolvedAt || report.updatedAt,
                },
              ]),
        ]}
      />
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link href={`/reports/${item.id}`} className={linkClass}>
          Open report #{item.id} ↗
        </Link>
        <span>
          · Sent by {reporterHandle ? `@${reporterHandle}` : 'this account'}
        </span>
      </div>
    </Row>
  )
}

function AppealForm({
  item,
  did,
  onDone,
  action,
}: {
  item: ActionedSubject
  did: string
  onDone: () => void
  action?: InboxAction
}) {
  const agent = useLabelerAgent()
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()
  const reasonLength = countGraphemes(reason)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setPending(true)
    setError(undefined)
    try {
      await submitInboxAppeal(agent, item.subject, reason.trim(), action?.id)
      await queryClient.invalidateQueries({
        queryKey: ['moderatorInboxPreview', 'actioned-subjects', did],
      })
      await queryClient.invalidateQueries({
        queryKey: ['inboxActionDetail', did, subjectKey(item.subject)],
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inboxUnreadCounts', did] }),
        queryClient.invalidateQueries({
          queryKey: ['inboxNotifications', did],
        }),
        queryClient.invalidateQueries({
          queryKey: ['inboxAccountStatus', did],
        }),
      ])
      setReason('')
      onDone()
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Could not submit appeal',
      )
    } finally {
      setPending(false)
    }
  }
  return (
    <form onSubmit={submit} className={cardClass}>
      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
        Appeal this decision for the account
      </h3>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
        This submits an appeal for {did} to the moderation queue.
      </p>
      {action && (
        <p className="mt-2 text-sm">
          Decision: {readable(action.type)} · {date(action.createdAt)}
        </p>
      )}
      <label
        className="mt-3 block text-sm font-medium"
        htmlFor={`appeal-${subjectKey(item.subject)}`}
      >
        Reason for appeal (optional)
      </label>
      <textarea
        id={`appeal-${subjectKey(item.subject)}`}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        maxLength={20000}
        rows={3}
        className="mt-1 w-full rounded-md border-gray-300 bg-white text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100"
      />
      <p
        className={`mt-1 text-xs ${reasonLength > 2000 ? 'text-red-600' : 'text-gray-500 dark:text-gray-400'}`}
      >
        {reasonLength.toLocaleString()} / 2,000 characters
      </p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || reasonLength > 2000}
        className="mt-3 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? 'Submitting…' : 'Submit appeal'}
      </button>
    </form>
  )
}

export function ActionedRow({
  item,
  did,
  hydrated,
  selected = false,
}: {
  item: ActionedSubject
  did: string
  hydrated?: ToolsOzoneModerationDefs.SubjectView
  selected?: boolean
}) {
  const [open, setOpen] = useState(selected)
  useEffect(() => {
    if (selected) setOpen(true)
  }, [selected])
  const [showAppeal, setShowAppeal] = useState(false)
  const key = subjectKey(item.subject)
  const detail = useActionedSubjectDetail(did, key, open)
  const subject = detail.data?.pages[0] || item
  const actions = detail.data
    ? mergeActions(detail.data.pages)
    : item.latestAction
      ? [item.latestAction]
      : []
  const appealAction = actions.find(isAppealableAction)
  const state =
    subject.appeal?.state === 'pending'
      ? 'Appeal under review'
      : subject.appeal?.state === 'resolved'
        ? `Appeal reviewed · ${enforcementLabel(subject.enforcement.state)}`
        : enforcementLabel(subject.enforcement.state)
  return (
    <Row
      title={subjectTitle(item.subject, hydrated)}
      subtitle={`${state} · Updated ${date(subject.updatedAt)}`}
      isRead={subject.isRead}
      open={open}
      onToggle={() => setOpen(!open)}
    >
      {detail.isLoading && <Loading message="Loading action history" />}
      {detail.isError && (
        <QueryError error={detail.error} retry={() => void detail.refetch()} />
      )}
      <section className={cardClass}>
        <h3 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">
          Your {key?.startsWith('did:') ? 'account' : 'content'}
        </h3>
        <SubjectContent
          subject={subject.subject}
          hydrated={hydrated}
          record={detail.data?.pages[0].record}
        />
        <dl className="mt-4 grid gap-3 text-sm text-gray-900 dark:text-gray-100 sm:grid-cols-2">
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Current status</dt>
            <dd>{enforcementLabel(subject.enforcement.state)}</dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">First action</dt>
            <dd>{date(subject.createdAt, true)}</dd>
          </div>
          {subject.enforcement.scope && (
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Scope</dt>
              <dd>{scopeLabel(subject.enforcement.scope)}</dd>
            </div>
          )}
          {subject.enforcement.labels?.length ? (
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Labels</dt>
              <dd>{subject.enforcement.labels.join(', ')}</dd>
            </div>
          ) : null}
          {subject.enforcement.expiresAt && (
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Expires</dt>
              <dd>{date(subject.enforcement.expiresAt, true)}</dd>
            </div>
          )}
          {subject.appeal?.state && subject.appeal.state !== 'none' && (
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Appeal</dt>
              <dd>
                {appealLabel(subject.appeal.state)}
                {subject.appeal.resolvedAt &&
                  ` · ${date(subject.appeal.resolvedAt)}`}
              </dd>
            </div>
          )}
          {subject.appeal?.appealedAt && (
            <div>
              <dt className="text-gray-500 dark:text-gray-400">
                Appeal submitted
              </dt>
              <dd>{date(subject.appeal.appealedAt, true)}</dd>
            </div>
          )}
          {subject.appeal?.appealableUntil && (
            <div>
              <dt className="text-gray-500 dark:text-gray-400">
                Appeal window ends
              </dt>
              <dd>{date(subject.appeal.appealableUntil, true)}</dd>
            </div>
          )}
        </dl>
        {subject.availableActions?.includes('appeal') && !showAppeal && (
          <button
            type="button"
            onClick={() => setShowAppeal(true)}
            className="mt-4 rounded-md border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400"
          >
            Appeal this decision
          </button>
        )}
      </section>
      {showAppeal && subject.availableActions?.includes('appeal') && (
        <AppealForm
          item={subject}
          did={did}
          onDone={() => setShowAppeal(false)}
          action={appealAction}
        />
      )}
      <Timeline
        events={[
          ...actions
            .slice()
            .reverse()
            .flatMap((action) => [
              { label: readable(action.type), at: action.createdAt },
              ...(action.reversedAt
                ? [
                    {
                      label: `${readable(action.type)} reversed`,
                      at: action.reversedAt,
                    },
                  ]
                : []),
            ]),
          ...(subject.appeal?.appealedAt
            ? [{ label: 'Appeal submitted', at: subject.appeal.appealedAt }]
            : []),
          ...(subject.appeal?.resolvedAt
            ? [{ label: 'Appeal reviewed', at: subject.appeal.resolvedAt }]
            : []),
        ]}
      />
      {(actions.length > 0 || detail.hasNextPage) && (
        <section className={cardClass}>
          <h3 className="font-semibold">Action history</h3>
          <ol className="mt-3 space-y-4">
            {actions.map((action) => (
              <li
                key={action.id}
                className="border-t border-gray-200 pt-3 first:border-t-0 first:pt-0 dark:border-slate-700"
              >
                <p className="text-sm font-medium">
                  {readable(action.type)}{' '}
                  <span className="font-normal text-gray-500 dark:text-gray-400">
                    · {date(action.createdAt, true)}
                  </span>
                </p>
                {action.scope && (
                  <p className="mt-1 text-sm">
                    Scope: {scopeLabel(action.scope)}
                  </p>
                )}
                {action.labels?.length ? (
                  <p className="mt-1 text-sm">
                    Labels: {action.labels.join(', ')}
                  </p>
                ) : null}
                {action.reversedAt && (
                  <p className="mt-1 text-sm">
                    Reversed {date(action.reversedAt, true)}
                  </p>
                )}
                {action.expiresAt && (
                  <p className="mt-1 text-sm">
                    Expires {date(action.expiresAt, true)}
                  </p>
                )}
                {action.policies?.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                    {action.policies.map((policy) => (
                      <li key={policy.key}>
                        <a
                          href={
                            /^https?:\/\//i.test(policy.link)
                              ? policy.link
                              : undefined
                          }
                          target="_blank"
                          rel="noreferrer"
                          className={linkClass}
                        >
                          {policy.displayName}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
          {detail.hasNextPage && (
            <div className="mt-4">
              <LoadMore
                pending={detail.isFetchingNextPage}
                onClick={() => void detail.fetchNextPage()}
              />
            </div>
          )}
        </section>
      )}
      {detail.data?.pages[0].reports && (
        <section className={cardClass}>
          <h3 className="font-semibold">Reports about this subject</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {detail.data.pages[0].reports.reasonTypes.map((reasonType) => (
              <ReasonBadge key={reasonType} reasonType={reasonType} />
            ))}
          </div>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            First reported{' '}
            {date(detail.data.pages[0].reports.firstReportedOn, false, true)} ·
            Last reported{' '}
            {date(detail.data.pages[0].reports.lastReportedOn, false, true)}
          </p>
        </section>
      )}
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {item.actionCount !== undefined
          ? `${item.actionCount} actions`
          : `${actions.length} actions loaded`}
      </div>
    </Row>
  )
}

export function PreviewFrame({
  did,
  current,
  children,
}: {
  did: string
  current: InboxSection
  children: React.ReactNode
}) {
  const router = useRouter()
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Mod Inbox
        </h2>
        <label className="text-sm text-gray-600 dark:text-gray-300 sm:hidden">
          Inbox section{' '}
          <select
            className={selectClass}
            value={current}
            onChange={(event) =>
              router.push(
                `/repositories/${encodeURIComponent(did)}/inbox/${event.target.value}`,
              )
            }
          >
            <option value="actioned-subjects">Actioned subjects</option>
            <option value="reports">Reports sent</option>
            <option value="notifications">Notifications</option>
          </select>
        </label>
        <div
          role="group"
          aria-label="Inbox preview sections"
          className="hidden max-w-full overflow-x-auto sm:block"
        >
          <ButtonGroup
            size="sm"
            appearance="primary"
            leftAligned
            items={[
              {
                id: 'actioned-subjects',
                text: 'Actioned subjects',
                Icon: ShieldCheckIcon,
                isActive: current === 'actioned-subjects',
                'aria-pressed': current === 'actioned-subjects',
                onClick: () =>
                  router.push(
                    `/repositories/${encodeURIComponent(did)}/inbox/actioned-subjects`,
                  ),
              },
              {
                id: 'reports',
                text: 'Reports sent',
                Icon: DocumentTextIcon,
                isActive: current === 'reports',
                'aria-pressed': current === 'reports',
                onClick: () =>
                  router.push(
                    `/repositories/${encodeURIComponent(did)}/inbox/reports`,
                  ),
              },
              {
                id: 'notifications',
                text: 'Notifications',
                Icon: BellIcon,
                isActive: current === 'notifications',
                'aria-pressed': current === 'notifications',
                onClick: () =>
                  router.push(
                    `/repositories/${encodeURIComponent(did)}/inbox/notifications`,
                  ),
              },
            ]}
          />
        </div>
      </div>
      <InboxSummary did={did} />
      <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
        Previewing the account’s inbox. Opening items here does not change their
        read state.
      </p>
      {children}
    </section>
  )
}

export function LoadMore({
  pending,
  onClick,
}: {
  pending: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100"
    >
      {pending ? 'Loading more…' : 'Load more'}
    </button>
  )
}

export function QueryError({
  error,
  retry,
}: {
  error: unknown
  retry: () => void
}) {
  return (
    <div role="alert" className="my-3">
      <LoadingFailed error={error} />
      <button type="button" onClick={retry} className={linkClass}>
        Try again
      </button>
    </div>
  )
}

function useActionedSubjectDetail(did: string, key?: string, enabled = true) {
  const agent = useLabelerAgent()
  return useInfiniteQuery<ActionedSubjectDetail, Error>({
    queryKey: ['inboxActionDetail', did, key],
    enabled: enabled && !!key && did.startsWith('did:'),
    staleTime: 15_000,
    queryFn: ({ signal, pageParam }) =>
      fetchInboxDetail(
        agent,
        did,
        'actioned-subjects',
        key!,
        signal,
        typeof pageParam === 'string' ? pageParam : undefined,
      ),
    getNextPageParam: (page) => page.cursor || undefined,
  })
}

const selectClass =
  'ml-1 rounded-md border-gray-300 bg-white text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100'

function InboxControls({
  filter,
  setFilter,
  sort,
  setSort,
  subjects = false,
}: {
  filter: InboxFilter
  setFilter: (filter: InboxFilter) => void
  sort: InboxSort
  setSort: (sort: InboxSort) => void
  subjects?: boolean
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
      <label>
        Show{' '}
        <select
          className={selectClass}
          value={filter}
          onChange={(event) => setFilter(event.target.value as InboxFilter)}
        >
          <option value="all">All</option>
          <option value="pending">Under review</option>
          <option value="resolved">Resolved</option>
          <option value="unread">Unread</option>
        </select>
      </label>
      <label>
        Sort by{' '}
        <select
          className={selectClass}
          value={sort.sortField}
          onChange={(event) =>
            setSort({
              ...sort,
              sortField: event.target.value as InboxSort['sortField'],
            })
          }
        >
          <option value="updatedAt">Last updated</option>
          <option value="createdAt">Created</option>
        </select>
      </label>
      <label>
        Order{' '}
        <select
          className={selectClass}
          value={sort.sortDirection}
          onChange={(event) =>
            setSort({
              ...sort,
              sortDirection: event.target.value as InboxSort['sortDirection'],
            })
          }
        >
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
      </label>
      {subjects && (filter === 'pending' || filter === 'resolved') && (
        <p className="w-full text-xs">
          Under review and resolved refer to the subject’s appeal.
        </p>
      )}
    </div>
  )
}

function LinkedReport({ did, id }: { did: string; id: number }) {
  const agent = useLabelerAgent()
  const detail = useQuery<ReportDetail, Error>({
    queryKey: ['inboxReportDetail', did, id],
    enabled: did.startsWith('did:'),
    staleTime: 15_000,
    queryFn: ({ signal }) =>
      fetchInboxDetail(agent, did, 'reports', id, signal),
  })
  const items = useMemo(
    () => (detail.data ? [detail.data.report] : []),
    [detail.data],
  )
  const hydrated = useHydratedSubjects(items, did)
  return (
    <section className="mb-5 space-y-2" aria-label="Selected report">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
        Selected report #{id}
      </h3>
      {detail.isLoading && <Loading message="Loading selected report" />}
      {detail.isError && (
        <QueryError error={detail.error} retry={() => void detail.refetch()} />
      )}
      {detail.data && (
        <ReportRow
          did={did}
          item={detail.data.report}
          selected
          hydrated={
            hydrated.data?.[subjectKey(detail.data.report.subject) || '']
          }
          reporterHandle={hydrated.data?.[did]?.repo?.handle}
        />
      )}
    </section>
  )
}

function LinkedSubject({ did, subject }: { did: string; subject: string }) {
  const detail = useActionedSubjectDetail(did, subject)
  const item = detail.data?.pages[0]
  const items = useMemo(() => (item ? [item] : []), [item])
  const hydrated = useHydratedSubjects(items, did)
  return (
    <section className="mb-5 space-y-2" aria-label="Selected subject">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
        Selected subject
      </h3>
      {detail.isLoading && <Loading message="Loading selected subject" />}
      {detail.isError && !item && (
        <QueryError error={detail.error} retry={() => void detail.refetch()} />
      )}
      {item && (
        <ActionedRow
          did={did}
          item={item}
          selected
          hydrated={hydrated.data?.[subjectKey(item.subject) || '']}
        />
      )}
    </section>
  )
}

export function ReportsPreview({ did }: { did: string }) {
  const [filter, setFilter] = useState<InboxFilter>('all')
  const [sort, setSort] = useState<InboxSort>({
    sortField: 'updatedAt',
    sortDirection: 'desc',
  })
  const searchParams = useSearchParams()
  const selected = Number(searchParams.get('reportId'))
  const query = useInboxPreview<InboxReport>(did, 'reports', filter, sort)
  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) || [],
    [query.data],
  )
  const hydrated = useHydratedSubjects(items, did)
  return (
    <PreviewFrame did={did} current="reports">
      <InboxControls
        filter={filter}
        setFilter={setFilter}
        sort={sort}
        setSort={setSort}
      />
      {Number.isSafeInteger(selected) &&
        selected > 0 &&
        !items.some((item) => item.id === selected) && (
          <LinkedReport key={selected} did={did} id={selected} />
        )}
      {!did.startsWith('did:') ? (
        <p className="text-red-600">A DID is required to preview this inbox.</p>
      ) : query.isLoading ? (
        <Loading message="Loading reports" />
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
            <p className={cardClass}>No reports match this filter.</p>
          )}
          <div className="space-y-2">
            {items.map((item) => (
              <ReportRow
                key={item.id}
                item={item}
                did={did}
                selected={item.id === selected}
                hydrated={hydrated.data?.[subjectKey(item.subject) || '']}
                reporterHandle={hydrated.data?.[did]?.repo?.handle}
              />
            ))}
          </div>
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

export function ActionedSubjectsPreview({ did }: { did: string }) {
  const [filter, setFilter] = useState<InboxFilter>('all')
  const [sort, setSort] = useState<InboxSort>({
    sortField: 'updatedAt',
    sortDirection: 'desc',
  })
  const searchParams = useSearchParams()
  const selected = searchParams.get('subject')
  const query = useInboxPreview<ActionedSubject>(
    did,
    'actioned-subjects',
    filter,
    sort,
  )
  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) || [],
    [query.data],
  )
  const hydrated = useHydratedSubjects(items, did)
  return (
    <PreviewFrame did={did} current="actioned-subjects">
      <InboxControls
        subjects
        filter={filter}
        setFilter={setFilter}
        sort={sort}
        setSort={setSort}
      />
      {selected &&
        !items.some((item) => subjectKey(item.subject) === selected) && (
          <LinkedSubject key={selected} did={did} subject={selected} />
        )}
      {!did.startsWith('did:') ? (
        <p className="text-red-600">A DID is required to preview this inbox.</p>
      ) : query.isLoading ? (
        <Loading message="Loading actioned subjects" />
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
            <p className={cardClass}>No actioned subjects match this filter.</p>
          )}
          <div className="space-y-2">
            {items.map((item) => (
              <ActionedRow
                key={subjectKey(item.subject) || JSON.stringify(item.subject)}
                item={item}
                did={did}
                selected={subjectKey(item.subject) === selected}
                hydrated={hydrated.data?.[subjectKey(item.subject) || '']}
              />
            ))}
          </div>
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
