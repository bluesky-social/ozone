'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  ComAtprotoAdminGetModerationEvent as GetEvent,
  AppBskyFeedGetPostThread as GetPostThread,
  ComAtprotoAdminDefs,
} from '@atproto/api'
import { ChevronLeftIcon } from '@heroicons/react/20/solid'
import { Json } from '@/common/Json'
import { classNames } from '@/lib/util'
import { RecordCard, RepoCard } from '@/common/RecordCard'
import { getType } from '@/reports/helpers/getType'
import { DataField, DataFieldProps } from '@/common/DataField'
import { ReasonBadge } from '@/reports/ReasonBadge'
import { MOD_EVENT_TITLES } from './constants'
import { ReviewStateIcon } from '@/subject/ReviewStateMarker'

enum Views {
  Details,
}

export function EventView({ event }: { event: GetEvent.OutputSchema }) {
  const [currentView, setCurrentView] = useState(Views.Details)
  const eventTitle =
    event.event.$type && MOD_EVENT_TITLES[event.event.$type as string]
      ? MOD_EVENT_TITLES[event.event.$type as string]
      : 'Event'

  const headerTitle = `${eventTitle} #${event?.id ?? ''}`

  const eventSubjectValue =
    ComAtprotoAdminDefs.isRecordView(event.subject) && event.subject.value
  const shortType = getType(eventSubjectValue).replace('app.bsky.feed.', '')
  const subHeaderTitle = ComAtprotoAdminDefs.isRecordView(event.subject)
    ? `${shortType} record of @${event.subject.repo.handle}`
    : `repo of @${event.subject.handle}`

  const titleIcon =
    (ComAtprotoAdminDefs.isRecordView(event.subject) ||
      ComAtprotoAdminDefs.isRepoView(event.subject)) &&
    event.subject.moderation.subjectStatus ? (
      <span className="flex items-center">
        <ReviewStateIcon
          subjectStatus={event.subject.moderation.subjectStatus}
        />
      </span>
    ) : null

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
                href={'/'}
                className="inline-flex items-center space-x-3 text-sm font-medium text-gray-900"
              >
                <ChevronLeftIcon
                  className="-ml-2 h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
                <span>{'Moderation Queue'}</span>
              </Link>
            </nav>

            <article>
              <Header
                icon={titleIcon}
                title={headerTitle}
                subTitle={subHeaderTitle}
              />
              {event ? (
                <>
                  <Tabs
                    currentView={currentView}
                    event={event}
                    onSetCurrentView={setCurrentView}
                  />
                  {currentView === Views.Details && <Details event={event} />}
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

function Tabs({
  currentView,
  onSetCurrentView,
}: {
  currentView: Views
  event: GetEvent.OutputSchema
  actions?: GetPostThread.OutputSchema
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
          </nav>
        </div>
      </div>
    </div>
  )
}

function Details({ event }: { event: GetEvent.OutputSchema }) {
  const { createdAt, createdBy, subject } = event

  const labels: DataFieldProps[] = [
    {
      label: 'Created At',
      value: new Date(createdAt).toLocaleString(),
    },
    {
      label: 'Created By DID',
      showCopyButton: true,
      value: createdBy,
    },
  ]

  const commentComponent = ComAtprotoAdminDefs.isModEventReport(
    event.event,
  ) && (
    <span>
      <ReasonBadge reasonType={event.event.reportType} /> {event.event.comment}
    </span>
  )

  return (
    <div className="mx-auto mt-6 max-w-5xl px-4 sm:px-6 lg:px-8">
      <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 mb-6">
        {labels.map((label, index) => (
          <DataField key={index} {...label} />
        ))}
        {!!commentComponent && (
          <DataField label="Reason" value={`${event.event.comment || ''}`}>
            {commentComponent}
          </DataField>
        )}
      </dl>

      <dt className="text-sm font-medium text-gray-500 mb-3">Created By:</dt>
      {createdBy && (
        <div className="rounded border-2 border-dashed border-gray-300 p-2 pb-1 mb-3">
          <RepoCard did={createdBy} />
        </div>
      )}

      <dt className="text-sm font-medium text-gray-500 mb-3">Subject:</dt>
      {(ComAtprotoAdminDefs.isRecordView(subject) ||
        ComAtprotoAdminDefs.isRecordViewNotFound(subject)) && (
        <div className="rounded border-2 border-dashed border-gray-300 p-2 pb-0 mb-3">
          <RecordCard uri={subject.uri} />
        </div>
      )}
      {(ComAtprotoAdminDefs.isRepoView(subject) ||
        ComAtprotoAdminDefs.isRepoViewNotFound(subject)) && (
        <div className="rounded border-2 border-dashed border-gray-300 p-2 pb-1 mb-3">
          <RepoCard did={subject.did} />
        </div>
      )}
      <Json className="mt-6" label="Contents" value={event} />
    </div>
  )
}

const Header = ({
  icon,
  title,
  subTitle,
}: {
  icon: JSX.Element | null
  title: string
  subTitle: string
}) => {
  return (
    <div className="flex flex-col sm:flex-row mx-auto space-y-6 sm:space-x-4 sm:space-y-0 max-w-5xl px-4 sm:px-6 lg:px-8 justify-between">
      <div>
        <h1 className="flex text-2xl font-bold text-gray-900 align-middle">
          {icon}
          <span className="ml-1">{title}</span>
        </h1>
        <h2 className="flex-1 text-l text-gray-700">{subTitle}</h2>
      </div>
    </div>
  )
}
