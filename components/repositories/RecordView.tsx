'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  ToolsOzoneModerationGetRecord as GetRecord,
  AppBskyFeedGetPostThread as GetPostThread,
  AppBskyFeedDefs,
  AppBskyActorDefs,
  ToolsOzoneModerationDefs,
  AtUri,
  AppBskyGraphDefs,
} from '@atproto/api'
import {
  ChevronLeftIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/20/solid'
import { Json } from '@/common/Json'
import { parseAtUri } from '@/lib/util'
import { BlobsTable } from './BlobsTable'
import {
  LabelList,
  LabelListEmpty,
  getLabelsForSubject,
  ModerationLabel,
} from '@/common/labels'
import { DataField } from '@/common/DataField'
import { AccountsGrid } from './AccountView'
import { ModEventList } from '@/mod-event/EventList'
import { ReviewStateIconLink } from '@/subject/ReviewStateMarker'
import { Dropdown } from '@/common/Dropdown'
import { Tabs, TabView } from '@/common/Tabs'
import { Likes } from '@/common/feeds/Likes'
import { Reposts } from '@/common/feeds/Reposts'
import { Thread } from '@/common/feeds/PostThread'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { CollectionId } from '@/reports/helpers/subject'
import ListAccounts from 'components/list/Accounts'

enum Views {
  Details,
  Profiles,
  Thread,
  Blobs,
  ModEvents,
  Likes,
  Reposts,
}

const TabKeys = {
  details: Views.Details,
  profiles: Views.Profiles,
  thread: Views.Thread,
  blobs: Views.Blobs,
  modevents: Views.ModEvents,
  likes: Views.Likes,
  reposts: Views.Reposts,
}

export function RecordView({
  record,
  list,
  thread,
  onReport,
  onShowActionPanel,
}: {
  list?: AppBskyGraphDefs.ListView
  record: GetRecord.OutputSchema
  thread?: GetPostThread.OutputSchema
  onReport: (uri: string) => void
  onShowActionPanel: (subject: string) => void
}) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const atUri = new AtUri(record.uri)
  const isListRecord = atUri.collection === CollectionId.List

  const currentView =
    TabKeys[searchParams.get('tab') || 'details'] || TabKeys.details
  const setCurrentView = (view: Views) => {
    const newParams = new URLSearchParams(searchParams)
    const newTab = Object.entries(TabKeys).find(([, v]) => v === view)?.[0]
    newParams.set('tab', newTab || 'details')
    router.push((pathname ?? '') + '?' + newParams.toString())
  }

  const getTabViews = () => {
    const views: TabView<Views>[] = [{ view: Views.Details, label: 'Details' }]
    if (isListRecord) {
      views.push({
        view: Views.Profiles,
        label: 'Profiles',
        sublabel: String(list?.listItemCount || ''),
      })
    }
    if (!!thread) {
      views.push({
        view: Views.Thread,
        label: 'Post Thread',
      })

      if (AppBskyFeedDefs.isThreadViewPost(thread.thread)) {
        views.push(
          {
            view: Views.Likes,
            label: 'Likes',
            sublabel: String(thread.thread.post.likeCount),
          },
          {
            view: Views.Reposts,
            label: 'Reposts',
            sublabel: String(thread.thread.post.repostCount),
          },
        )
      }
    }
    views.push(
      {
        view: Views.Blobs,
        label: 'Blobs',
        sublabel: String(record.blobs.length),
      },
      { view: Views.ModEvents, label: 'Mod Events' },
    )

    return views
  }

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
                href={`/repositories/${record.repo.did}`}
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
                    views={getTabViews()}
                    currentView={currentView}
                    onSetCurrentView={setCurrentView}
                  />
                  {currentView === Views.Details && <Details record={record} />}
                  {currentView === Views.Profiles && (
                    <ListAccounts uri={record.uri} />
                  )}
                  {currentView === Views.Likes &&
                    !!thread &&
                    AppBskyFeedDefs.isThreadViewPost(thread?.thread) && (
                      <Likes
                        uri={thread.thread.post.uri}
                        cid={thread.thread.post.cid}
                      />
                    )}
                  {currentView === Views.Reposts &&
                    !!thread &&
                    AppBskyFeedDefs.isThreadViewPost(thread?.thread) && (
                      <Reposts
                        uri={thread.thread.post.uri}
                        cid={thread.thread.post.cid}
                      />
                    )}
                  {currentView === Views.Thread && thread && (
                    <Thread thread={thread.thread} />
                  )}
                  {currentView === Views.Blobs && (
                    <BlobsTable
                      authorDid={record.repo.did}
                      blobs={record.blobs}
                    />
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

function Details({ record }: { record: GetRecord.OutputSchema }) {
  const { collection, rkey } = parseAtUri(record.uri) ?? {}
  const labels = getLabelsForSubject({ record })
  return (
    <div className="mx-auto mt-6 max-w-5xl px-4 sm:px-6 lg:px-8">
      <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 mb-10">
        {record.value?.['displayName'] && (
          <DataField
            label="Display Name"
            value={`${record.value['displayName']}`}
          />
        )}
        {record.value?.['name'] && (
          <DataField label="Name" value={`${record.value['name']}`} />
        )}
        {record.value?.['description'] && (
          <DataField
            label="Description"
            value={`${record.value['description']}`}
          />
        )}
        <DataField label="Handle" value={record.repo.handle} showCopyButton>
          <Link href={`/repositories/${record.repo.did}`} className="underline">
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
              <ModerationLabel
                label={label}
                key={label.val}
                recordAuthorDid={record.repo.did}
              />
            ))}
          </LabelList>
        </DataField>
      </dl>
      <Json className="mb-3" label="Contents" value={record.value} />
    </div>
  )
}
