'use client'

import type {
  ToolsOzoneModerationDefs,
  ToolsOzoneModerationEmitEvent,
} from '@atproto/api'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/20/solid'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Loading, LoadingFailed } from '@/common/Loader'
import { reasonTypeOptions } from '@/reports/helpers/getType'
import { SubjectOverview } from '@/reports/SubjectOverview'
import {
  ActionPanelNames,
  hydrateModToolInfo,
  useEmitEvent,
} from '@/mod-event/helpers/emitEvent'
import { ModActionPanelQuick } from 'app/actions/ModActionPanel/QuickAction'
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
  type ReportFilter,
} from './api'
import { useInboxPreview } from './useInboxPreview'

type Hydrated = Record<string, ToolsOzoneModerationDefs.SubjectView>
const cardClass =
  'rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900'
const linkClass = 'text-blue-600 hover:underline dark:text-blue-400'

function date(value?: string, time = false) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return time
    ? parsed.toLocaleString()
    : parsed.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
}

function readable(value?: string) {
  if (!value) return '—'
  return value
    .replace(/^.*#/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (letter) => letter.toUpperCase())
}

function reason(value: string) {
  return (
    reasonTypeOptions[value as keyof typeof reasonTypeOptions] ||
    readable(value)
  )
}

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
}: {
  subject: SubjectRef
  hydrated?: ToolsOzoneModerationDefs.SubjectView
}) {
  const key = subjectKey(subject)
  const value = hydrated?.record?.value
  const description =
    typeof value?.text === 'string'
      ? value.text
      : typeof value?.description === 'string'
        ? value.description
        : undefined
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
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
      {!hydrated && key && (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Content unavailable or removed
        </p>
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
        {events.map((event, index) => (
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

function useHydratedSubjects(items: { subject: SubjectRef }[], did: string) {
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

function Row({
  title,
  subtitle,
  isRead,
  open,
  onToggle,
  children,
}: {
  title: string
  subtitle: string
  isRead: boolean
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
        className={`flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-gray-50 dark:hover:bg-slate-700 ${!isRead ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </span>
          <span className="mt-1 block text-sm text-gray-600 dark:text-gray-300">
            {subtitle}
          </span>
        </span>
        {!isRead && (
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

function ReportRow({
  item,
  did,
  hydrated,
  reporterHandle,
}: {
  item: InboxReport
  did: string
  hydrated?: ToolsOzoneModerationDefs.SubjectView
  reporterHandle?: string
}) {
  const [open, setOpen] = useState(false)
  const agent = useLabelerAgent()
  const detail = useQuery<ReportDetail, Error>({
    queryKey: ['inboxReportDetail', did, item.id],
    enabled: open,
    queryFn: ({ signal }) =>
      fetchInboxDetail(agent, did, 'reports', item.id, signal),
  })
  const report = detail.data?.report || item
  const resolution = detail.data?.resolution
  const status =
    report.status === 'pending'
      ? 'Awaiting review'
      : resolution?.outcome === 'noAction' || !report.lastActionTaken
        ? 'No action taken'
        : readable(resolution?.actionTaken || report.lastActionTaken)
  return (
    <Row
      title={subjectTitle(item.subject, hydrated)}
      subtitle={`${status} · ${date(item.updatedAt)}`}
      isRead={item.isRead}
      open={open}
      onToggle={() => setOpen(!open)}
    >
      {detail.isLoading && <Loading message="Loading report details" />}
      {detail.isError && <LoadingFailed error={detail.error} />}
      <section className={cardClass}>
        <h3 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">
          What was reported
        </h3>
        <SubjectContent subject={report.subject} hydrated={hydrated} />
        <dl className="mt-4 grid gap-3 text-sm text-gray-900 dark:text-gray-100 sm:grid-cols-2">
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Reason</dt>
            <dd>{reason(report.reasonType)}</dd>
          </div>
          {report.reason && (
            <div>
              <dt className="text-gray-500 dark:text-gray-400">
                Reporter’s note
              </dt>
              <dd className="whitespace-pre-wrap">{report.reason}</dd>
            </div>
          )}
        </dl>
      </section>
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
}: {
  item: ActionedSubject
  did: string
  onDone: () => void
}) {
  const agent = useLabelerAgent()
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setPending(true)
    setError(undefined)
    try {
      await submitInboxAppeal(agent, item.subject, reason.trim())
      await queryClient.invalidateQueries({
        queryKey: ['moderatorInboxPreview', 'actioned-subjects', did],
      })
      await queryClient.invalidateQueries({
        queryKey: ['inboxActionDetail', did, subjectKey(item.subject)],
      })
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
      <label
        className="mt-3 block text-sm font-medium"
        htmlFor={`appeal-${subjectKey(item.subject)}`}
      >
        Reason for appeal
      </label>
      <textarea
        id={`appeal-${subjectKey(item.subject)}`}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        maxLength={20000}
        rows={3}
        className="mt-1 w-full rounded-md border-gray-300 bg-white text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100"
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? 'Submitting…' : 'Submit appeal'}
      </button>
    </form>
  )
}

function ActionedRow({
  item,
  did,
  hydrated,
}: {
  item: ActionedSubject
  did: string
  hydrated?: ToolsOzoneModerationDefs.SubjectView
}) {
  const [open, setOpen] = useState(false)
  const [showAppeal, setShowAppeal] = useState(false)
  const agent = useLabelerAgent()
  const key = subjectKey(item.subject)
  const detail = useQuery<ActionedSubjectDetail, Error>({
    queryKey: ['inboxActionDetail', did, key],
    enabled: open && !!key,
    queryFn: ({ signal }) =>
      fetchInboxDetail(agent, did, 'actioned-subjects', key!, signal),
  })
  const subject = detail.data || item
  const state =
    subject.appeal?.state === 'pending'
      ? 'Appeal pending'
      : subject.enforcement.state === 'none'
        ? 'Action reversed'
        : readable(subject.enforcement.state)
  return (
    <Row
      title={subjectTitle(item.subject, hydrated)}
      subtitle={`${state} · ${date(item.updatedAt)}`}
      isRead={item.isRead}
      open={open}
      onToggle={() => setOpen(!open)}
    >
      {detail.isLoading && <Loading message="Loading action history" />}
      {detail.isError && <LoadingFailed error={detail.error} />}
      <section className={cardClass}>
        <h3 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">
          Your {key?.startsWith('did:') ? 'account' : 'content'}
        </h3>
        <SubjectContent subject={subject.subject} hydrated={hydrated} />
        <dl className="mt-4 grid gap-3 text-sm text-gray-900 dark:text-gray-100 sm:grid-cols-2">
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Current status</dt>
            <dd>{readable(subject.enforcement.state)}</dd>
          </div>
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
                {readable(subject.appeal.state)}
                {subject.appeal.resolvedAt &&
                  ` · ${date(subject.appeal.resolvedAt)}`}
              </dd>
            </div>
          )}
          {subject.appeal?.note && (
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Public note</dt>
              <dd>{subject.appeal.note}</dd>
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
      {showAppeal && (
        <AppealForm
          item={subject}
          did={did}
          onDone={() => setShowAppeal(false)}
        />
      )}
      <Timeline
        events={[
          ...(
            detail.data?.actions ||
            (item.latestAction ? [item.latestAction] : [])
          )
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
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {item.actionCount ?? detail.data?.actions.length ?? 0} actions
      </div>
    </Row>
  )
}

function PreviewFrame({
  did,
  current,
  children,
}: {
  did: string
  current: 'reports' | 'actioned-subjects'
  children: React.ReactNode
}) {
  const params = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const emitEvent = useEmitEvent()
  const quickOpen = params.get('quickOpen') || ''
  const setQuickOpen = (subject: string) => {
    const next = new URLSearchParams(params)
    if (subject) next.set('quickOpen', subject)
    else next.delete('quickOpen')
    router.replace(`${pathname}?${next}`)
  }
  return (
    <main className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <Link
        href={`/repositories/${encodeURIComponent(did)}`}
        className={`text-sm ${linkClass}`}
      >
        ← Back to repository
      </Link>
      <h1 className="mt-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
        Moderation inbox preview
      </h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
        What this account sees from the moderation service.
      </p>
      <p className="mt-1 break-all text-xs text-gray-500 dark:text-gray-400">
        {did}
      </p>
      <nav
        aria-label="Inbox preview sections"
        className="mt-5 flex gap-6 border-b border-gray-200 text-sm dark:border-slate-700"
      >
        {(
          [
            ['reports', 'Reports sent'],
            ['actioned-subjects', 'Actioned subjects'],
          ] as const
        ).map(([kind, label]) => (
          <Link
            key={kind}
            href={`/repositories/${encodeURIComponent(did)}/inbox/${kind}`}
            aria-current={current === kind ? 'page' : undefined}
            className={`pb-2 ${current === kind ? 'border-b-2 border-blue-600 font-semibold text-blue-700 dark:text-blue-300' : linkClass}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-5">{children}</div>
      <ModActionPanelQuick
        open={!!quickOpen}
        onClose={() => setQuickOpen('')}
        setSubject={setQuickOpen}
        subject={quickOpen}
        subjectOptions={quickOpen ? [quickOpen] : []}
        isInitialLoading={false}
        onSubmit={async (vals: ToolsOzoneModerationEmitEvent.InputSchema) => {
          await emitEvent(
            hydrateModToolInfo(vals, ActionPanelNames.QuickAction),
          )
          await queryClient.invalidateQueries({
            queryKey: ['moderatorInboxPreview'],
          })
          await queryClient.invalidateQueries({
            queryKey: ['inboxActionDetail'],
          })
          await queryClient.invalidateQueries({
            queryKey: ['inboxReportDetail'],
          })
        }}
      />
    </main>
  )
}

function LoadMore({
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

export function ReportsPreview({ did }: { did: string }) {
  const [filter, setFilter] = useState<ReportFilter>('all')
  const query = useInboxPreview<InboxReport>(did, 'reports', filter)
  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) || [],
    [query.data],
  )
  const hydrated = useHydratedSubjects(items, did)
  return (
    <PreviewFrame did={did} current="reports">
      {!did.startsWith('did:') ? (
        <p className="text-red-600">A DID is required to preview this inbox.</p>
      ) : query.isLoading ? (
        <Loading message="Loading reports" />
      ) : query.isError && !items.length ? (
        <LoadingFailed error={query.error} />
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Reports sent
            </h2>
            <label className="text-sm text-gray-600 dark:text-gray-300">
              Show{' '}
              <select
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value as ReportFilter)
                }
                className="ml-1 rounded-md border-gray-300 bg-white text-sm dark:border-slate-600 dark:bg-slate-800"
              >
                <option value="all">All</option>
                <option value="pending">Awaiting review</option>
                <option value="resolved">Resolved</option>
                <option value="unread">Unread</option>
              </select>
            </label>
          </div>
          {hydrated.isError && (
            <p role="alert" className="mb-3 text-sm text-red-600">
              Could not load some subject content.
            </p>
          )}
          {!items.length && (
            <p className={cardClass}>No reports found from this account.</p>
          )}
          <div className="space-y-2">
            {items.map((item) => (
              <ReportRow
                key={item.id}
                item={item}
                did={did}
                hydrated={hydrated.data?.[subjectKey(item.subject) || '']}
                reporterHandle={hydrated.data?.[did]?.repo?.handle}
              />
            ))}
          </div>
          {query.isError && (
            <p role="alert" className="mt-4 text-sm text-red-600">
              Could not update this list: {query.error?.message}
            </p>
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
  const query = useInboxPreview<ActionedSubject>(did, 'actioned-subjects')
  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) || [],
    [query.data],
  )
  const hydrated = useHydratedSubjects(items, did)
  return (
    <PreviewFrame did={did} current="actioned-subjects">
      {!did.startsWith('did:') ? (
        <p className="text-red-600">A DID is required to preview this inbox.</p>
      ) : query.isLoading ? (
        <Loading message="Loading actioned subjects" />
      ) : query.isError && !items.length ? (
        <LoadingFailed error={query.error} />
      ) : (
        <>
          <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">
            Actioned subjects
          </h2>
          {hydrated.isError && (
            <p role="alert" className="mb-3 text-sm text-red-600">
              Could not load some subject content.
            </p>
          )}
          {!items.length && (
            <p className={cardClass}>
              No actioned subjects found for this account.
            </p>
          )}
          <div className="space-y-2">
            {items.map((item) => (
              <ActionedRow
                key={subjectKey(item.subject) || JSON.stringify(item.subject)}
                item={item}
                did={did}
                hydrated={hydrated.data?.[subjectKey(item.subject) || '']}
              />
            ))}
          </div>
          {query.isError && (
            <p role="alert" className="mt-4 text-sm text-red-600">
              Could not update this list: {query.error?.message}
            </p>
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
