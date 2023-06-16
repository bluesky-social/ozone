'use client'
import { ReactNode, useState } from 'react'
import Link from 'next/link'
import {
  ComAtprotoAdminGetRecord as GetRecord,
  AppBskyFeedGetPostThread as GetPostThread,
  ComAtprotoAdminDefs,
  AppBskyFeedDefs,
} from '@atproto/api'
import {
  ChevronLeftIcon,
  ExclamationCircleIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/20/solid'
import { Json } from '../common/Json'
import { classNames, parseAtUri } from '@/lib/util'
import { ReportsTable } from '../reports/ReportsTable'
import { PostAsCard } from '../common/posts/PostsFeed'
import { BlobsTable } from './BlobsTable'
import {
  LabelChip,
  LabelList,
  LabelListEmpty,
  displayLabel,
  toLabelVal,
} from '../common/labels'

enum Views {
  Details,
  Thread,
  Blobs,
  Reports,
}

export function RecordView({
  record,
  thread,
  onReport,
}: {
  record: GetRecord.OutputSchema
  thread?: GetPostThread.OutputSchema
  onReport: (uri: string) => void
}) {
  const [currentView, setCurrentView] = useState(Views.Details)
  return (
    <div className="flex h-full bg-white">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="relative z-0 flex flex-1 overflow-hidden">
          <main className="relative z-0 flex-1 overflow-y-auto focus:outline-none xl:order-last">
            <nav
              className="flex items-start px-4 py-3 sm:px-6 lg:px-8"
              aria-label="Breadcrumb"
            >
              <Link
                href={`/repositories/${record.repo.handle}`}
                className="inline-flex items-center space-x-3 text-sm font-medium text-gray-900"
              >
                <ChevronLeftIcon
                  className="-ml-2 h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
                <span>@{record.repo.handle}</span>
              </Link>
            </nav>

            <article>
              <Header record={record} onReport={onReport} />
              {record ? (
                <>
                  <Tabs
                    currentView={currentView}
                    record={record}
                    thread={thread}
                    onSetCurrentView={setCurrentView}
                  />
                  {currentView === Views.Details && <Details record={record} />}
                  {currentView === Views.Thread && thread && (
                    <Thread thread={thread.thread} />
                  )}
                  {currentView === Views.Blobs && (
                    <Blobs blobs={record.blobs} />
                  )}
                  {currentView === Views.Reports && (
                    <Reports reports={record.moderation.reports} />
                  )}
                </>
              ) : (
                <div className="py-8 mx-auto max-w-5xl px-4 sm:px-6 lg:px-12 text-xl">
                  Loading...
                </div>
              )}
            </article>
          </main>
        </div>
      </div>
    </div>
  )
}

function Header({
  record,
  onReport,
}: {
  record: GetRecord.OutputSchema
  onReport: (uri: string) => void
}) {
  const collection = parseAtUri(record.uri)?.collection ?? ''
  const shortCollection = collection.replace('app.bsky.feed.', '')
  const { currentAction } = record.moderation
  const actionColorClasses =
    currentAction?.action === ComAtprotoAdminDefs.TAKEDOWN
      ? 'text-rose-600 hover:text-rose-700'
      : 'text-indigo-600 hover:text-indigo-900'
  const displayActionType = currentAction?.action.replace(
    'com.atproto.admin.defs#',
    '',
  )
  return (
    <div className="flex flex-col sm:flex-row mx-auto space-y-6 sm:space-x-4 sm:space-y-0 max-w-5xl px-4 sm:px-6 lg:px-8">
      <h1 className="flex-1 text-2xl font-bold text-gray-900">
        {`${shortCollection} record by @${record.repo.handle}`}{' '}
        {currentAction && (
          <Link
            href={`/actions/${currentAction.id}`}
            className={`text-lg ${actionColorClasses}`}
            title={displayActionType}
          >
            <ShieldExclamationIcon className="h-5 w-5 ml-1 inline-block align-text-top" />{' '}
            #{currentAction.id}
          </Link>
        )}
      </h1>
      <div>
        <button
          type="button"
          className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
          onClick={() => onReport(record.uri)}
        >
          <ExclamationCircleIcon
            className="-ml-1 mr-2 h-5 w-5 text-gray-400"
            aria-hidden="true"
          />
          <span>Report Post</span>
        </button>
      </div>
    </div>
  )
}

function Tabs({
  currentView,
  record,
  thread,
  onSetCurrentView,
}: {
  currentView: Views
  record: GetRecord.OutputSchema
  thread?: GetPostThread.OutputSchema
  onSetCurrentView: (v: Views) => void
}) {
  const Tab = ({
    view,
    label,
    sublabel,
  }: {
    view: Views
    label: string
    sublabel?: string
  }) => (
    <span
      className={classNames(
        view === currentView
          ? 'border-pink-500 text-gray-900'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
        'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm cursor-pointer',
      )}
      aria-current={view === currentView ? 'page' : undefined}
      onClick={() => onSetCurrentView(view)}
    >
      {label}{' '}
      {sublabel ? (
        <span className="text-xs font-bold text-gray-400">{sublabel}</span>
      ) : undefined}
    </span>
  )

  return (
    <div className="mt-6 sm:mt-2 2xl:mt-5">
      <div className="border-b border-gray-200">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <Tab view={Views.Details} label="Details" />
            {!!thread && <Tab view={Views.Thread} label="Post Thread" />}
            <Tab
              view={Views.Blobs}
              label="Blobs"
              sublabel={String(record.blobs.length)}
            />
            <Tab view={Views.Reports} label="Reports" />
          </nav>
        </div>
      </div>
    </div>
  )
}

function Details({ record }: { record: GetRecord.OutputSchema }) {
  const Field = ({
    label,
    value,
    children,
  }: {
    label: string
    value?: string
    children?: ReactNode
  }) => (
    <div className="sm:col-span-1">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 truncate" title={value}>
        {children ?? value}
      </dd>
    </div>
  )
  const { collection, rkey } = parseAtUri(record.uri) ?? {}
  const labels = ((record.labels ?? []) as { val: string }[]).map(toLabelVal) // @TODO client types
  return (
    <div className="mx-auto mt-6 max-w-5xl px-4 sm:px-6 lg:px-8">
      <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 mb-10">
        <Field label="Handle">
          <Link
            href={`/repositories/${record.repo.handle}`}
            className="underline"
          >
            {record.repo.handle}
          </Link>
        </Field>
        <Field label="DID">
          <Link href={`/repositories/${record.repo.did}`} className="underline">
            {record.repo.did}
          </Link>
        </Field>
        <Field label="Collection" value={collection ?? ''} />
        <Field label="Rkey" value={rkey ?? ''} />
        <Field label="URI" value={record.uri} />
        <Field label="CID" value={record.cid} />
        <Field label="Labels">
          <LabelList>
            {!labels.length && <LabelListEmpty />}
            {labels.map((label) => (
              <LabelChip key={label}>{displayLabel(label)}</LabelChip>
            ))}
          </LabelList>
        </Field>
      </dl>
      <Json className="mb-3" label="Contents" value={record.value} />
    </div>
  )
}

function Blobs({ blobs }: { blobs: ComAtprotoAdminDefs.BlobView[] }) {
  return <BlobsTable blobs={blobs} />
}

export function Reports({
  reports,
}: {
  reports: GetRecord.OutputSchema['moderation']['reports']
}) {
  // We show reports loaded from repo view so separately showing loading state here is not necessary
  return (
    <ReportsTable
      reports={reports}
      showLoadMore={false}
      onLoadMore={() => null}
      isInitialLoading={false}
    />
  )
}

function Thread({ thread }: { thread: GetPostThread.OutputSchema['thread'] }) {
  return (
    <div className="flex flex-col mx-auto mt-6 max-w-5xl px-4 sm:px-6 lg:px-8">
      <ThreadPost highlight depth={getThreadDepth(thread)} thread={thread} />
    </div>
  )
}

function ThreadPost({
  depth,
  thread,
  highlight,
}: {
  depth: number
  thread: GetPostThread.OutputSchema['thread']
  highlight?: boolean
}) {
  if (AppBskyFeedDefs.isThreadViewPost(thread)) {
    return (
      <>
        {thread.parent && (
          <ThreadPost depth={depth - 1} thread={thread.parent} />
        )}
        <ThreadPostWrapper depth={depth} highlight={highlight}>
          <PostAsCard
            className="bg-transparent"
            item={thread}
            controls={false}
            dense
          />
        </ThreadPostWrapper>
        {thread.replies?.map((reply, i) => (
          <ThreadPost
            key={`${thread.post.uri}-reply-${i}`}
            depth={depth + 1}
            thread={reply}
          />
        ))}
      </>
    )
  } else if (AppBskyFeedDefs.isNotFoundPost(thread)) {
    return (
      <ThreadPostWrapper depth={depth}>
        Not found: ${thread.uri}
      </ThreadPostWrapper>
    )
  } else {
    return <ThreadPostWrapper depth={depth}>Unknown</ThreadPostWrapper>
  }
}

function ThreadPostWrapper({
  depth,
  highlight,
  children,
}: {
  depth: number
  highlight?: boolean
  children: ReactNode
}) {
  return (
    <div
      style={{ marginLeft: depth * 12 }}
      className={classNames('p-2', highlight ? 'bg-amber-100' : '')}
    >
      {children}
    </div>
  )
}

function getThreadDepth(thread: GetPostThread.OutputSchema['thread']) {
  let depth = 0
  while (AppBskyFeedDefs.isThreadViewPost(thread.parent)) {
    thread = thread.parent
    depth++
  }
  return depth
}
