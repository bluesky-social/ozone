'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  ComAtprotoAdminGetRecord as GetRecord,
  ComAtprotoAdminGetModerationReport as GetReport,
  AppBskyFeedGetPostThread as GetPostThread,
  ComAtprotoAdminModerationAction as ModAction,
  ComAtprotoAdminBlob as Blob,
} from '@atproto/api'

import {
  ChevronLeftIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/20/solid'
import { Json } from '../../common/Json'
import { classNames } from '../../../lib/util'
import { ReasonBadge } from '../../reports/ReportsTable'
import { useQuery } from '@tanstack/react-query'
import client from '../../../lib/client'
import { Header } from './Header'
import { RecordCard, RepoCard } from '../../common/RecordCard'
import { ActionsTable } from './ActionsTable'

enum Views {
  Details,
  Actions,
}

export function ReportView({ id }: { id: string }) {
  const { data: report } = useQuery({
    queryKey: ['report', { id }],
    queryFn: async () => {
      const { data } = await client.api.com.atproto.admin.getModerationReport(
        { id: parseInt(id, 10) },
        { headers: client.adminHeaders() },
      )
      return data
    },
  })
  console.log(report)

  const [currentView, setCurrentView] = useState(Views.Details)

  if (!report) {
    // TODO: Show loading state
    return null
  }

  // TODO: Type
  const headerTitle = `Report #${report?.id ?? ''}`
  const isReportForRecord = report?.subject?.$type?.includes('admin.record')
  const shortType =
    report?.subject?.value?.$type?.replace('app.bsky.feed.', '') ?? ''
  const subHeaderTitle = isReportForRecord
    ? `${shortType} record of @${report?.subject?.repo?.handle ?? ''}`
    : `repo of @${report?.subject?.handle ?? ''}`
  const resolved = !!report.resolvedByActions?.length
  const titleIcon = (
    <span className="flex items-center">
      {resolved ? (
        <CheckCircleIcon
          title="Resolved"
          className="h-6 w-6 inline-block text-green-500 align-text-bottom"
        />
      ) : (
        <ExclamationCircleIcon
          title="Unresolved"
          className="h-6 w-6 inline-block text-yellow-500 align-text-bottom"
        />
      )}
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
                action={{ title: 'Resolve Report', onClick: () => {} }}
              />
              {report ? (
                <>
                  {' '}
                  <Tabs
                    currentView={currentView}
                    report={report}
                    onSetCurrentView={setCurrentView}
                  />
                  {currentView === Views.Details && <Details report={report} />}
                  {currentView === Views.Actions && (
                    <ActionsTable actions={report.resolvedByActions} />
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
  report,
  onSetCurrentView,
}: {
  currentView: Views
  report: GetReport.OutputSchema
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
            <Tab
              view={Views.Actions}
              label="Actions"
              // TODO: Type
              report={report}
              sublabel={report?.resolvedByActions?.length.toString() ?? '0'}
            />
          </nav>
        </div>
      </div>
    </div>
  )
}

// TODO: Type
function Details({ report }: { record: GetRecord.OutputSchema }) {
  const Field = ({ label, value }: { label: string; value: string }) => (
    <div className="sm:col-span-1">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd
        className="mt-1 text-sm text-gray-900 truncate"
        title={typeof value === 'string' ? value : undefined}
      >
        {value}
      </dd>
    </div>
  )

  const {
    createdAt,
    reason,
    reasonType: readonTypeRaw,
    reportedByDid,
    subject,
  } = report
  const reasonType = readonTypeRaw?.split('#')?.[1]

  const labels: { label: string; value: string }[] = [
    {
      label: 'Created At',
      value: new Date(createdAt).toLocaleString(),
    },
    {
      label: 'Reported By DID',
      value: reportedByDid,
    },
  ]

  const reasonComponent = (
    <dd className="mt-1 truncate text-gray-700">
      <ReasonBadge reasonType={reasonType} /> {reason}
    </dd>
  )

  return (
    <div className="mx-auto mt-6 max-w-5xl px-4 sm:px-6 lg:px-8">
      <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 mb-6">
        {labels.map(({ label, value }, index) => (
          <Field key={index} label={label} value={value} />
        ))}
        {/* TODO: type */}
        <Field label="Reason" value={reasonComponent} />
      </dl>

      <dt className="text-sm font-medium text-gray-500 mb-3">Reported By:</dt>
      {reportedByDid && (
        <div className="rounded border-2 border-dashed border-gray-300 p-2 pb-1 mb-3">
          <RepoCard did={reportedByDid} />
        </div>
      )}

      <dt className="text-sm font-medium text-gray-500 mb-3">Subject:</dt>
      {subject.uri?.startsWith('at://') && (
        <div className="rounded border-2 border-dashed border-gray-300 p-2 pb-0 mb-3">
          <RecordCard uri={subject.uri} />
        </div>
      )}
      {subject.did?.startsWith('did:') && (
        <div className="rounded border-2 border-dashed border-gray-300 p-2 pb-1 mb-3">
          <RepoCard did={reportedByDid} />
        </div>
      )}
      <Json className="mt-6" label="Contents" value={report} />
    </div>
  )
}
