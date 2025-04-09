'use client'
import { useState, type JSX } from 'react'
import Link from 'next/link'
import {
  ToolsOzoneModerationGetEvent as GetEvent,
  ToolsOzoneModerationDefs,
} from '@atproto/api'
import { ChevronLeftIcon } from '@heroicons/react/20/solid'
import { Json } from '@/common/Json'
import { RecordCard, RepoCard } from '@/common/RecordCard'
import { getType } from '@/reports/helpers/getType'
import { DataField, DataFieldProps } from '@/common/DataField'
import { ReasonBadge } from '@/reports/ReasonBadge'
import { MOD_EVENT_TITLES } from './constants'
import { ReviewStateIcon } from '@/subject/ReviewStateMarker'
import { Tabs } from '@/common/Tabs'

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
    ToolsOzoneModerationDefs.isRecordView(event.subject) && event.subject.value
  const shortType = getType(eventSubjectValue).replace('app.bsky.feed.', '')
  const subHeaderTitle = ToolsOzoneModerationDefs.isRecordView(event.subject)
    ? `${shortType} record of @${event.subject.repo.handle}`
    : ToolsOzoneModerationDefs.isRepoView(event.subject)
    ? `repo of @${event.subject.handle}`
    : ''

  const titleIcon =
    (ToolsOzoneModerationDefs.isRecordView(event.subject) ||
      ToolsOzoneModerationDefs.isRepoView(event.subject)) &&
    event.subject.moderation.subjectStatus ? (
      <span className="flex items-center">
        <ReviewStateIcon
          subjectStatus={event.subject.moderation.subjectStatus}
        />
      </span>
    ) : null

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
                href={'/'}
                className="inline-flex items-center space-x-3 text-sm font-medium text-gray-900 dark:text-gray-200"
              >
                <ChevronLeftIcon
                  className="-ml-2 h-5 w-5 text-gray-400 dark:text-gray-50"
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
                    onSetCurrentView={setCurrentView}
                    views={[{ view: Views.Details, label: 'Details' }]}
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

  const commentComponent = ToolsOzoneModerationDefs.isModEventReport(
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
        {ToolsOzoneModerationDefs.isModEventReport(event.event) && (
          <DataField label="Reason" value={`${event.event.comment || ''}`}>
            {commentComponent}
          </DataField>
        )}
      </dl>

      <dt className="text-sm font-medium text-gray-500 dark:text-gray-50 mb-3">
        Created By:
      </dt>
      {createdBy && (
        <div className="rounded border-2 border-dashed border-gray-300 p-2 pb-1 mb-3">
          <RepoCard did={createdBy} />
        </div>
      )}

      <dt className="text-sm font-medium text-gray-500 dark:text-gray-50 mb-3">
        Subject:
      </dt>
      {(ToolsOzoneModerationDefs.isRecordView(subject) ||
        ToolsOzoneModerationDefs.isRecordViewNotFound(subject)) && (
        <div className="rounded border-2 border-dashed border-gray-300 p-2 pb-0 mb-3">
          <RecordCard uri={subject.uri} />
        </div>
      )}
      {(ToolsOzoneModerationDefs.isRepoView(subject) ||
        ToolsOzoneModerationDefs.isRepoViewNotFound(subject)) && (
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
        <h1 className="flex text-2xl font-bold text-gray-900 dark:text-gray-200 align-middle">
          {icon}
          <span className="ml-1">{title}</span>
        </h1>
        <h2 className="flex-1 text-l text-gray-700 dark:text-gray-100">
          {subTitle}
        </h2>
      </div>
    </div>
  )
}
