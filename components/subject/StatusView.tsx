import { DataField, DataFieldProps } from '@/common/DataField'
import { Json } from '@/common/Json'
import { RecordCard, RepoCard } from '@/common/RecordCard'
import { Tabs } from '@/common/Tabs'
import { ModEventList } from '@/mod-event/EventList'
import {
  AtUri,
  ComAtprotoAdminDefs,
  ComAtprotoRepoDefs,
  ComAtprotoRepoStrongRef,
  ToolsOzoneModerationDefs,
} from '@atproto/api'
import { ChevronLeftIcon } from '@heroicons/react/20/solid'
import Link from 'next/link'
import { useState, type JSX } from 'react'
import { ReviewStateIcon } from './ReviewStateMarker'

enum Views {
  Details,
  Events,
}

export const SubjectStatusView = ({
  subjectStatus,
}: {
  subjectStatus: ToolsOzoneModerationDefs.SubjectStatusView
}) => {
  const [currentView, setCurrentView] = useState(Views.Details)
  const headerTitle = `Moderation Status #${subjectStatus.id ?? ''}`

  const shortType = ComAtprotoRepoStrongRef.isMain(subjectStatus.subject)
    ? new AtUri(`${subjectStatus.subject.uri}`).collection.replace(
        'app.bsky.feed.',
        '',
      )
    : null
  const subHeaderTitle = shortType
    ? `${shortType} record of @${subjectStatus.subjectRepoHandle}`
    : `repo of @${subjectStatus.subjectRepoHandle}`

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
                icon={
                  <span className="flex items-center">
                    <ReviewStateIcon subjectStatus={subjectStatus} />
                  </span>
                }
                title={headerTitle}
                subTitle={subHeaderTitle}
              />
              {subjectStatus ? (
                <>
                  <Tabs
                    views={[
                      { view: Views.Details, label: 'Details' },
                      { view: Views.Events, label: 'Events' },
                    ]}
                    currentView={currentView}
                    onSetCurrentView={setCurrentView}
                  />
                  {currentView === Views.Details && (
                    <Details subjectStatus={subjectStatus} />
                  )}
                  {currentView === Views.Events && (
                    <div className="mx-auto mt-6 max-w-5xl px-4 sm:px-6 lg:px-8">
                      <ModEventList
                        subject={
                          ComAtprotoRepoStrongRef.isMain(subjectStatus.subject)
                            ? subjectStatus.subject.uri
                            : ComAtprotoAdminDefs.isRepoRef(
                                subjectStatus.subject,
                              )
                            ? subjectStatus.subject.did
                            : undefined
                        }
                      />
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

function Details({
  subjectStatus,
}: {
  subjectStatus: ToolsOzoneModerationDefs.SubjectStatusView
}) {
  const {
    updatedAt,
    comment,
    muteUntil,
    lastReviewedAt,
    lastReportedAt,
    takendown,
    lastAppealedAt,
    suspendUntil,
  } = subjectStatus
  const labels: (DataFieldProps | null)[] = [
    {
      label: 'Last Update',
      value: new Date(updatedAt).toLocaleString(),
    },
    comment
      ? {
          label: 'Sticky Note',
          showCopyButton: true,
          value: comment,
        }
      : null,
    lastReportedAt
      ? {
          label: 'Last reported at',
          showCopyButton: true,
          value: new Date(lastReportedAt).toLocaleString(),
        }
      : null,
    lastReviewedAt
      ? {
          label: 'Last reviewed at',
          showCopyButton: true,
          value: new Date(lastReviewedAt).toLocaleString(),
        }
      : null,
    lastAppealedAt
      ? {
          label: 'Appealed at',
          showCopyButton: true,
          value: new Date(lastAppealedAt).toLocaleString(),
        }
      : null,
    muteUntil
      ? {
          label: 'Muted Until',
          value: new Date(muteUntil).toLocaleString(),
        }
      : null,
    suspendUntil
      ? {
          label: 'Suspended Until',
          value: new Date(suspendUntil).toLocaleString(),
        }
      : null,
    takendown
      ? {
          label: 'Takendown',
          value: 'Yes',
        }
      : null,
  ]

  return (
    <div className="mx-auto mt-6 max-w-5xl px-4 sm:px-6 lg:px-8">
      <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 mb-6">
        {labels
          .filter(Boolean)
          .map((label, index) => label && <DataField key={index} {...label} />)}
      </dl>
      <dt className="text-sm font-medium text-gray-500 mb-3">Subject:</dt>
      {ComAtprotoRepoStrongRef.isMain(subjectStatus.subject) && (
        <div className="rounded border-2 border-dashed border-gray-300 p-2 pb-0 mb-3">
          <RecordCard uri={`${subjectStatus.subject.uri}`} />
        </div>
      )}
      {ComAtprotoAdminDefs.isRepoRef(subjectStatus.subject) && (
        <div className="rounded border-2 border-dashed border-gray-300 p-2 pb-1 mb-3">
          <RepoCard did={`${subjectStatus.subject.did}`} />
        </div>
      )}
      <Json className="mt-6" label="Contents" value={subjectStatus} />
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
