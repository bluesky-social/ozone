'use client'

import Link from 'next/link'
import { Loading, LoadingFailed } from '@/common/Loader'
import {
  ActionedSubject,
  InboxReport,
  SubjectRef,
  useInboxPreview,
} from './useInboxPreview'

function formatDate(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function SubjectLink({ subject }: { subject: SubjectRef }) {
  const did = 'did' in subject ? subject.did : undefined
  const uri = 'uri' in subject ? subject.uri : undefined
  const href = uri?.startsWith('at://')
    ? `/repositories/${encodeURIComponent(uri.slice(5).split('/')[0])}/${uri.slice(5).split('/').slice(1).map(encodeURIComponent).join('/')}`
    : did?.startsWith('did:')
      ? `/repositories/${encodeURIComponent(did)}`
      : undefined
  const label = uri || did || ('convoId' in subject && subject.convoId)
    || ('messageId' in subject && subject.messageId)
    || 'Unknown subject'

  return href ? (
    <Link className="break-all text-blue-600 hover:underline dark:text-blue-400" href={href}>
      {label}
    </Link>
  ) : <span className="break-all">{label}</span>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-1 break-words text-sm text-gray-900 dark:text-gray-100">{children}</dd>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>
    </article>
  )
}

function ActionedSubjectCard({ item }: { item: ActionedSubject }) {
  return (
    <Card>
      <Field label="Subject"><SubjectLink subject={item.subject} /></Field>
      <Field label="Enforcement">{item.enforcement.state}</Field>
      <Field label="Read state">{item.isRead ? 'Read' : 'Unread'}</Field>
      <Field label="Scope">{item.enforcement.scope || '—'}</Field>
      <Field label="Appeal">{item.appeal?.state || '—'}</Field>
      {item.appeal?.note && <Field label="Appeal note">{item.appeal.note}</Field>}
      <Field label="Actions">{item.actionCount ?? '—'}</Field>
      <Field label="Last action">
        {item.latestAction ? <>
          <Link className="text-blue-600 hover:underline dark:text-blue-400" href={`/events/${item.latestAction.id}`}>
            {item.latestAction.type} #{item.latestAction.id}
          </Link>
          {' · '}{formatDate(item.latestAction.createdAt)}
        </> : '—'}
      </Field>
      <Field label="Active labels">{item.enforcement.labels?.join(', ') || '—'}</Field>
      <Field label="Enforcement expires">{formatDate(item.enforcement.expiresAt)}</Field>
      <Field label="First action">{formatDate(item.createdAt)}</Field>
      <Field label="Updated">{formatDate(item.updatedAt)}</Field>
      <Field label="Moderation service">{item.src}</Field>
    </Card>
  )
}

function ReportCard({ item }: { item: InboxReport }) {
  return (
    <Card>
      <Field label="Public report ID">#{item.id}</Field>
      <Field label="Subject"><SubjectLink subject={item.subject} /></Field>
      <Field label="Status">{item.status}</Field>
      <Field label="Read state">{item.isRead ? 'Read' : 'Unread'}</Field>
      <Field label="Reason type">{item.reasonType}</Field>
      <Field label="Reason">{item.reason || '—'}</Field>
      <Field label="Last action">{item.lastActionTaken || '—'}</Field>
      <Field label="Scope">{item.scope || '—'}</Field>
      <Field label="Submitted">{formatDate(item.createdAt)}</Field>
      <Field label="Updated">{formatDate(item.updatedAt)}</Field>
      <Field label="Moderation service">{item.src}</Field>
    </Card>
  )
}

function PreviewFrame({
  did,
  current,
  title,
  description,
  children,
}: {
  did: string
  current: 'reports' | 'actioned-subjects'
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <Link href={`/repositories/${encodeURIComponent(did)}`} className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← Back to repository
      </Link>
      <h1 className="mt-4 text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{description}</p>
      <p className="mt-1 break-all text-xs text-gray-500 dark:text-gray-400">Account: {did}</p>
      <nav aria-label="Inbox preview sections" className="mt-5 flex gap-4 border-b border-gray-200 text-sm dark:border-slate-700">
        <Link
          href={`/repositories/${encodeURIComponent(did)}/inbox/actioned-subjects`}
          aria-current={current === 'actioned-subjects' ? 'page' : undefined}
          className={current === 'actioned-subjects' ? 'border-b-2 border-blue-600 pb-2 font-medium text-blue-700 dark:text-blue-300' : 'pb-2 text-blue-600 hover:underline dark:text-blue-400'}
        >
          Actioned subjects
        </Link>
        <Link
          href={`/repositories/${encodeURIComponent(did)}/inbox/reports`}
          aria-current={current === 'reports' ? 'page' : undefined}
          className={current === 'reports' ? 'border-b-2 border-blue-600 pb-2 font-medium text-blue-700 dark:text-blue-300' : 'pb-2 text-blue-600 hover:underline dark:text-blue-400'}
        >
          Reports
        </Link>
      </nav>
      <div className="mt-6">{children}</div>
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
  return <button
    type="button"
    disabled={pending}
    onClick={onClick}
    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100 dark:hover:bg-slate-700"
  >{pending ? 'Loading more…' : 'Load more'}</button>
}

export function ActionedSubjectsPreview({ did }: { did: string }) {
  const query = useInboxPreview<ActionedSubject>(did, 'actioned-subjects')
  const items = query.data?.pages.flatMap((page) => page.items) || []
  return <PreviewFrame
    did={did}
    current="actioned-subjects"
    title="Actioned subjects"
    description="Moderator preview of moderation actions visible to this account."
  >
    {!did.startsWith('did:') ? <p className="text-red-600">A DID is required to preview this inbox.</p>
      : query.isLoading ? <Loading message="Loading actioned subjects" />
      : query.isError && !items.length ? <LoadingFailed error={query.error} />
      : <>
        {!items.length && <p className="rounded-md bg-white p-6 text-sm text-gray-600 dark:bg-slate-800 dark:text-gray-300">No actioned subjects found for this account.</p>}
        <div className="space-y-4">{items.map((item, index) =>
          <ActionedSubjectCard key={`${JSON.stringify(item.subject)}-${index}`} item={item} />,
        )}</div>
        {query.isError && <p role="alert" className="mt-4 text-sm text-red-600">Could not update this list: {query.error?.message}</p>}
        {query.hasNextPage && <div className="mt-6 text-center"><LoadMore pending={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()} /></div>}
      </>}
  </PreviewFrame>
}

export function ReportsPreview({ did }: { did: string }) {
  const query = useInboxPreview<InboxReport>(did, 'reports')
  const items = query.data?.pages.flatMap((page) => page.items) || []
  return <PreviewFrame
    did={did}
    current="reports"
    title="Reports sent"
    description="Moderator preview of reports submitted by this account."
  >
    {!did.startsWith('did:') ? <p className="text-red-600">A DID is required to preview this inbox.</p>
      : query.isLoading ? <Loading message="Loading reports" />
      : query.isError && !items.length ? <LoadingFailed error={query.error} />
      : <>
        {!items.length && <p className="rounded-md bg-white p-6 text-sm text-gray-600 dark:bg-slate-800 dark:text-gray-300">No reports found from this account.</p>}
        <div className="space-y-4">{items.map((item) => <ReportCard key={item.id} item={item} />)}</div>
        {query.isError && <p role="alert" className="mt-4 text-sm text-red-600">Could not update this list: {query.error?.message}</p>}
        {query.hasNextPage && <div className="mt-6 text-center"><LoadMore pending={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()} /></div>}
      </>}
  </PreviewFrame>
}
