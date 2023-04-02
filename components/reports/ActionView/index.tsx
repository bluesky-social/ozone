'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  ComAtprotoAdminGetModerationAction as GetAction,
  ComAtprotoAdminDefs,
} from '@atproto/api'
import {
  ChevronLeftIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/20/solid'
import { Json } from '../../common/Json'
import { classNames } from '../../../lib/util'
import { RecordCard, RepoCard } from '../../common/RecordCard'
import { ArrowUturnDownIcon } from '@heroicons/react/24/outline'
import { Header } from '../ReportView/Header'
import { actionOptions } from '../../../app/actions/ModActionPanel'
import { BlobsTable } from '../../repositories/BlobsTable'
import { Reports } from '../../repositories/RecordView'
import { getType } from '../ReportView/getType'

enum Views {
  Details,
  Blobs,
  Reports,
}

export function ActionView({
  action,
  setReverseActionPanelOpen,
}: {
  action: GetAction.OutputSchema
  setReverseActionPanelOpen: (open: boolean) => void
}) {
  const [currentView, setCurrentView] = useState(Views.Details)

  const headerTitle = `Action #${action?.id ?? ''}`
  const reportSubjectValue =
    ComAtprotoAdminDefs.isRecordView(action.subject) && action.subject.value
  const shortType = getType(reportSubjectValue).replace('app.bsky.feed.', '')
  const subHeaderTitle = ComAtprotoAdminDefs.isRecordView(action.subject)
    ? `${shortType} record of @${action.subject.repo.handle}`
    : `repo of @${action.subject.handle}`

  const resolved = !!action.resolvedReports?.length
  const wasReversed = !!action.reversal
  const actionColorClasses =
    action.action === ComAtprotoAdminDefs.TAKEDOWN
      ? 'text-rose-600 hover:text-rose-700'
      : 'text-indigo-600 hover:text-indigo-900'

  const titleIcon = (
    <span className="flex items-center">
      {resolved ? (
        <CheckCircleIcon
          title="Resolved"
          className={`h-6 w-6 inline-block align-text-bottom ${actionColorClasses}`}
        />
      ) : (
        <ExclamationCircleIcon
          title="Unresolved"
          className={`h-6 w-6 inline-block align-text-bottom ${actionColorClasses}`}
        />
      )}
      {wasReversed ? (
        <ArrowUturnDownIcon
          title="Reversed"
          className="h-6 w-6 inline-block text-red-500 align-text-bottom"
        />
      ) : null}
    </span>
  )

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
                href={'/reports'}
                className="inline-flex items-center space-x-3 text-sm font-medium text-gray-900"
              >
                <ChevronLeftIcon
                  className="-ml-2 h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
                <span>{'Reports'}</span>
              </Link>
            </nav>

            <article>
              <Header
                titleIcon={titleIcon}
                headerTitle={headerTitle}
                subHeaderTitle={subHeaderTitle}
                action={
                  wasReversed
                    ? undefined
                    : {
                        title: 'Reverse Action',
                        onClick: () => {
                          setReverseActionPanelOpen(true)
                        },
                      }
                }
              />
              {action ? (
                <>
                  <Tabs
                    currentView={currentView}
                    action={action}
                    onSetCurrentView={setCurrentView}
                  />
                  {currentView === Views.Details && <Details action={action} />}

                  {currentView === Views.Blobs && (
                    <BlobsTable blobs={action.subjectBlobs} />
                  )}
                  {currentView === Views.Reports && (
                    <Reports reports={action.resolvedReports} />
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

function Tabs({
  currentView,
  action,
  onSetCurrentView,
}: {
  currentView: Views
  action: GetAction.OutputSchema
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
            <Tab
              view={Views.Blobs}
              label="Blobs"
              sublabel={action?.subjectBlobs.length.toString() ?? '0'}
            />
            <Tab
              view={Views.Reports}
              label="Reports"
              sublabel={action?.resolvedReports.length.toString() ?? '0'}
            />
          </nav>
        </div>
      </div>
    </div>
  )
}

function Details({ action }: { action: GetAction.OutputSchema }) {
  const Field = ({
    label,
    value,
  }: {
    label: string
    value: string | React.ReactNode
  }) => (
    <div className="sm:col-span-1">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd
        className="mt-1 text-sm text-gray-900"
        title={typeof value === 'string' ? value : undefined}
      >
        {value}
      </dd>
    </div>
  )

  const { createdAt, reason, subject, createdBy } = action

  const actionType = action.action
  const readableActionType = actionType ? actionOptions[actionType] : ''

  const labels: { label: string; value: string }[] = [
    {
      label: 'Action',
      value: readableActionType,
    },
    {
      label: 'Created At',
      value: new Date(createdAt).toLocaleString(),
    },
    {
      label: 'Reason',
      value: reason,
    },
  ]

  const reversedAt = action.reversal
    ? new Date(action.reversal.createdAt).toLocaleString()
    : undefined

  return (
    <div className="mx-auto mt-6 max-w-5xl px-4 sm:px-6 lg:px-8">
      <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 mb-6">
        {labels.map(({ label, value }, index) => (
          <Field key={index} label={label} value={value} />
        ))}
      </dl>

      <dt className="text-sm font-medium text-gray-500 mb-3">Created By:</dt>
      {createdBy && (
        <div className="rounded border-2 border-dashed border-gray-300 p-2 pb-1 mb-3">
          <RepoCard did={createdBy} />
        </div>
      )}

      <dt className="text-sm font-medium text-gray-500 mb-3">Subject:</dt>

      {ComAtprotoAdminDefs.isRecordView(subject) && (
        <div className="rounded border-2 border-dashed border-gray-300 p-2 pb-0 mb-3">
          <RecordCard uri={subject.uri} />
        </div>
      )}
      {ComAtprotoAdminDefs.isRepoView(subject) && (
        <div className="rounded border-2 border-dashed border-gray-300 p-2 pb-1 mb-3">
          <RepoCard did={subject.did} />
        </div>
      )}

      {!!action.reversal && (
        <div className="mt-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 mb-6">
            <Field label={'Reversed Reason'} value={action.reversal.reason} />
            <Field label={'Reversed At'} value={reversedAt} />
          </dl>
          <>
            <dt className="text-sm font-medium text-gray-500 mb-3">
              Reversed By:
            </dt>
            <div className="rounded border-2 border-dashed border-gray-300 p-2 pb-1 mb-3">
              <RepoCard did={action.reversal.createdBy} />
            </div>
          </>
        </div>
      )}
      <Json className="mt-6" label="Contents" value={action} />
    </div>
  )
}
