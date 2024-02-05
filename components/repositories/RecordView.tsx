'use client'
import { ReactNode, useState } from 'react'
import Link from 'next/link'
import {
  ComAtprotoAdminGetRecord as GetRecord,
  AppBskyFeedGetPostThread as GetPostThread,
  ComAtprotoAdminDefs,
  AppBskyFeedDefs,
  AppBskyActorDefs,
} from '@atproto/api'
import {
  ChevronLeftIcon,
  ExclamationCircleIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/20/solid'
import { Json } from '../common/Json'
import { classNames, parseAtUri } from '@/lib/util'
import { PostAsCard } from '../common/posts/PostsFeed'
import { BlobsTable } from './BlobsTable'
import {
  LabelChip,
  LabelList,
  LabelListEmpty,
  displayLabel,
  toLabelVal,
  getLabelsForSubject,
} from '../common/labels'
import { DataField } from '@/common/DataField'
import { AccountsGrid } from './AccountView'
import { ModEventList } from '@/mod-event/EventList'
import { ReviewStateIconLink } from '@/subject/ReviewStateMarker'
import { Dropdown } from '@/common/Dropdown'

enum Views {
  Details,
  Profiles,
  Thread,
  Blobs,
  ModEvents,
}

export function RecordView({
  record,
  thread,
  profiles,
  onReport,
  onShowActionPanel,
}: {
  record: GetRecord.OutputSchema
  thread?: GetPostThread.OutputSchema
  profiles?: AppBskyActorDefs.ProfileView[]
  onReport: (uri: string) => void
  onShowActionPanel: (subject: string) => void
}) {
  const [currentView, setCurrentView] = useState(Views.Details)
  return (
    <div className="flex h-full bg-white dark:bg-slate-900">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="relative z-0 flex flex-1 overflow-hidden">
          <main className="relative z-0 flex-1 overflow-y-auto focus:outline-none xl:order-last">
            <nav
              className="flex items-start px-4 py-3 sm:px-6 lg:px-8"
              aria-label="Breadcrumb"
            >
              <Link
                href={`/repositories/${record.repo.handle}`}
                className="inline-flex items-center space-x-3 text-sm font-medium text-gray-900 dark:text-gray-200"
              >
                <ChevronLeftIcon
                  className="-ml-2 h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
                <span>@{record.repo.handle}</span>
              </Link>
            </nav>

            <article>
              <Header
                record={record}
                onReport={onReport}
                onShowActionPanel={onShowActionPanel}
              />
              {record ? (
                <>
                  <Tabs
                    currentView={currentView}
                    record={record}
                    thread={thread}
                    profiles={profiles}
                    onSetCurrentView={setCurrentView}
                  />
                  {currentView === Views.Details && <Details record={record} />}
                  {currentView === Views.Profiles && !!profiles?.length && (
                    <AccountsGrid error="" accounts={profiles} />
                  )}
                  {currentView === Views.Thread && thread && (
                    <Thread thread={thread.thread} />
                  )}
                  {currentView === Views.Blobs && (
                    <Blobs blobs={record.blobs} />
                  )}
                  {currentView === Views.ModEvents && (
                    <div className="flex flex-col mx-auto mt-6 max-w-5xl px-4 sm:px-6 lg:px-8 text-gray-500 dark:text-gray-50 text-sm">
                      <ModEventList subject={record.uri} />
                    </div>
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
  onShowActionPanel,
}: {
  record: GetRecord.OutputSchema
  onReport: (uri: string) => void
  onShowActionPanel: (subject: string) => void
}) {
  const collection = parseAtUri(record.uri)?.collection ?? ''
  let shortCollection = collection
    .replace('app.bsky.feed.', '')
    .replace('app.bsky.graph.', '')
  if (shortCollection === 'generator') shortCollection = 'feed generator'
  const { subjectStatus } = record.moderation
  return (
    <div className="flex flex-col sm:flex-row mx-auto space-y-6 sm:space-x-4 sm:space-y-0 max-w-5xl px-4 sm:px-6 lg:px-8">
      <h1 className="flex-1 text-2xl font-bold text-gray-900 dark:text-gray-200">
        {`${shortCollection} record by @${record.repo.handle}`}{' '}
        {!!subjectStatus && (
          <ReviewStateIconLink
            subjectStatus={subjectStatus}
            className="h-5 w-5 ml-1"
          />
        )}
      </h1>
      <div>
        <Dropdown
          className="inline-flex justify-center rounded-md border border-gray-300 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-100 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-500 dark:focus:ring-teal-500 focus:ring-offset-2"
          items={[
            {
              text: `Report ${shortCollection || 'post'}`,
              onClick: () => onReport(record.uri),
            },
            {
              text: `Report account`,
              onClick: () => onReport(record.repo.did),
            },
            {
              text: 'Show action panel',
              onClick: () => onShowActionPanel(record.uri),
            },
          ]}
        >
          <ExclamationCircleIcon
            className="-ml-1 mr-2 h-5 w-5 text-gray-400"
            aria-hidden="true"
          />
          <span>Take Action</span>
        </Dropdown>
      </div>
    </div>
  )
}

function Tabs({
  currentView,
  record,
  thread,
  // May be passed in when viewing a list record
  profiles,
  onSetCurrentView,
}: {
  currentView: Views
  record: GetRecord.OutputSchema
  thread?: GetPostThread.OutputSchema
  profiles?: AppBskyActorDefs.ProfileView[]
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
          ? 'border-pink-500 dark:border-teal-400 text-gray-900 dark:text-teal-500'
          : 'border-transparent text-gray-500 dark:text-gray-50 hover:text-gray-700 dark:hover:text-teal-200 hover:border-gray-300dark:hover:border-teal-300',
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
            {!!profiles?.length && (
              <Tab
                view={Views.Profiles}
                label="Profiles"
                sublabel={String(profiles.length)}
              />
            )}
            {!!thread && <Tab view={Views.Thread} label="Post Thread" />}
            <Tab
              view={Views.Blobs}
              label="Blobs"
              sublabel={String(record.blobs.length)}
            />
            <Tab view={Views.ModEvents} label="Mod Events" />
          </nav>
        </div>
      </div>
    </div>
  )
}

function Details({ record }: { record: GetRecord.OutputSchema }) {
  const { collection, rkey } = parseAtUri(record.uri) ?? {}
  const labels = getLabelsForSubject({ record }).map((label) =>
    toLabelVal(label, record.repo.did),
  )
  return (
    <div className="mx-auto mt-6 max-w-5xl px-4 sm:px-6 lg:px-8">
      <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 mb-10">
        <DataField label="Handle" value={record.repo.handle} showCopyButton>
          <Link
            href={`/repositories/${record.repo.handle}`}
            className="underline"
          >
            {record.repo.handle}
          </Link>
        </DataField>
        <DataField label="DID" value={record.repo.did} showCopyButton>
          <Link href={`/repositories/${record.repo.did}`} className="underline">
            {record.repo.did}
          </Link>
        </DataField>
        <DataField label="Collection" value={collection ?? ''} />
        <DataField label="Rkey" value={rkey ?? ''} />
        <DataField
          label="URI"
          value={record.uri}
          showCopyButton
          shouldTruncateValue
        />
        <DataField
          label="CID"
          value={record.cid}
          showCopyButton
          shouldTruncateValue
        />
        <DataField label="Labels">
          <LabelList>
            {!labels.length && <LabelListEmpty />}
            {labels.map((label) => (
              <LabelChip key={label}>{displayLabel(label)}</LabelChip>
            ))}
          </LabelList>
        </DataField>
      </dl>
      <Json className="mb-3" label="Contents" value={record.value} />
    </div>
  )
}

function Blobs({ blobs }: { blobs: ComAtprotoAdminDefs.BlobView[] }) {
  return <BlobsTable blobs={blobs} />
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
