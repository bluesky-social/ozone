'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  AppBskyActorGetProfile as GetProfile,
  ComAtprotoAdminGetRepo as GetRepo,
  AppBskyGraphGetFollows as GetFollows,
  AppBskyGraphGetFollowers as GetFollowers,
  ComAtprotoAdminModerationAction as ModAction,
} from '@atproto/api'
import {
  ChevronLeftIcon,
  EnvelopeIcon,
  ExclamationCircleIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/20/solid'
import { AuthorFeed } from '../common/feeds/AuthorFeed'
import { Json } from '../common/Json'
import { classNames } from '../../lib/util'
import client from '../../lib/client'
import { ReportPanel } from '../reports/ReportPanel'
import { ReportsTable } from '../reports/ReportsTable'
import React from 'react'

enum Views {
  Details,
  Posts,
  Follows,
  Followers,
  Reports,
}

export function AccountView({
  repo,
  profile,
  error,
  id,
  onSubmit,
}: {
  id: string
  repo?: GetRepo.OutputSchema
  profile?: GetProfile.OutputSchema
  error?: unknown
  onSubmit: (vals: any) => Promise<void>
}) {
  const [currentView, setCurrentView] = useState<Views>(Views.Details)
  const [reportUri, setReportUri] = useState<string>()

  return (
    <div className="flex h-full bg-white">
      <ReportPanel
        open={!!reportUri}
        onClose={() => setReportUri(undefined)}
        subject={reportUri}
        onSubmit={onSubmit}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="relative z-0 flex flex-1 overflow-hidden">
          <main className="relative z-0 flex-1 overflow-y-auto focus:outline-none xl:order-last">
            <nav
              className="flex items-start px-4 py-3 sm:px-6 lg:px-8"
              aria-label="Breadcrumb"
            >
              <Link
                href="/repositories"
                className="inline-flex items-center space-x-3 text-sm font-medium text-gray-900"
              >
                <ChevronLeftIcon
                  className="-ml-2 h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
                <span>Repositories</span>
              </Link>
            </nav>

            <article>
              <Header
                id={id}
                repo={repo}
                profile={profile}
                onReport={setReportUri}
              />
              {repo ? (
                <>
                  <Tabs
                    currentView={currentView}
                    profile={profile}
                    repo={repo}
                    onSetCurrentView={setCurrentView}
                  />
                  {currentView === Views.Details && (
                    <Details profile={profile} repo={repo} />
                  )}
                  {currentView === Views.Posts && (
                    <Posts id={id} onReport={setReportUri} />
                  )}
                  {currentView === Views.Follows && <Follows id={id} />}
                  {currentView === Views.Followers && <Followers id={id} />}
                  {currentView === Views.Reports && (
                    <Reports reports={repo.moderation.reports} />
                  )}
                </>
              ) : (
                <div className="py-8 mx-auto max-w-5xl px-4 sm:px-6 lg:px-12 text-xl">
                  {error ? 'An error occurred' : 'Loading...'}
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
  id,
  repo,
  profile,
  onReport,
}: {
  id: string
  repo?: GetRepo.OutputSchema
  profile?: GetProfile.OutputSchema
  onReport: (did: string) => void
}) {
  const { currentAction } = repo?.moderation ?? {}
  const actionColorClasses =
    currentAction?.action === ModAction.TAKEDOWN
      ? 'text-rose-600 hover:text-rose-700'
      : 'text-indigo-600 hover:text-indigo-900'
  const displayActionType = currentAction?.action.replace(
    'com.atproto.admin.moderationAction#',
    '',
  )
  const displayActorName = repo
    ? profile?.displayName
      ? `${profile.displayName} @${repo.handle}`
      : `@${repo.handle}`
    : id.startsWith('did:')
    ? id
    : `@${id}`
  return (
    <div>
      <div>
        <img
          className="h-32 w-full object-cover lg:h-48"
          src={profile?.banner || '/img/default-banner.jpg'}
          alt=""
        />
      </div>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="-mt-12 sm:-mt-16 sm:flex sm:items-end sm:space-x-5">
          <div className="flex">
            <img
              className="h-24 w-24 rounded-full ring-4 ring-white sm:h-32 sm:w-32"
              src={profile?.avatar || '/img/default-avatar.jpg'}
              alt=""
            />
          </div>
          <div className="mt-6 sm:flex sm:min-w-0 sm:flex-1 sm:items-center sm:justify-end sm:space-x-6 sm:pb-1">
            <div className="mt-6 min-w-0 flex-1 sm:hidden 2xl:block">
              <h1 className="truncate text-2xl font-bold text-gray-900">
                {displayActorName}{' '}
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
            </div>
            <div className="justify-stretch mt-6 flex flex-row space-x-3">
              {repo?.account?.email && (
                <a
                  role="button"
                  href={`mailto:${repo.account.email}`}
                  className="sm:flex-1 inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
                >
                  <EnvelopeIcon
                    className="-ml-1 mr-2 h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                  <span>Message</span>
                </a>
              )}
              <button
                type="button"
                className="sm:flex-1 inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
                onClick={() => repo && onReport(repo.did)}
              >
                <ExclamationCircleIcon
                  className="-ml-1 mr-2 h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
                <span>Report</span>
              </button>
            </div>
          </div>
        </div>
        <div className="mt-6 hidden min-w-0 flex-1 sm:block 2xl:hidden">
          <h1 className="truncate text-2xl font-bold text-gray-900">
            {displayActorName}{' '}
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
        </div>
      </div>
    </div>
  )
}

function Tabs({
  currentView,
  profile,
  repo,
  onSetCurrentView,
}: {
  currentView: Views
  profile?: GetProfile.OutputSchema
  repo: GetRepo.OutputSchema
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
            <Tab view={Views.Details} label="Profile" />
            {profile && (
              <Tab
                view={Views.Posts}
                label="Posts"
                sublabel={String(profile.postsCount)}
              />
            )}
            {profile && (
              <Tab
                view={Views.Follows}
                label="Follows"
                sublabel={String(profile.followsCount)}
              />
            )}
            {profile && (
              <Tab
                view={Views.Followers}
                label="Followers"
                sublabel={String(profile.followersCount)}
              />
            )}
            <Tab
              view={Views.Reports}
              label="Reports"
              sublabel={String(repo.moderation.reports.length)}
            />
          </nav>
        </div>
      </div>
    </div>
  )
}

function Details({
  profile,
  repo,
}: {
  profile?: GetProfile.OutputSchema
  repo: GetRepo.OutputSchema
}) {
  const Field = ({ label, value }: { label: string; value: string }) => (
    <div className="sm:col-span-1">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value}</dd>
    </div>
  )
  return (
    <div className="mx-auto mt-6 max-w-5xl px-4 sm:px-6 lg:px-8">
      <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 mb-10">
        <Field label="Handle" value={repo.handle} />
        <Field label="DID" value={repo.did} />
        {profile?.description && (
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500">Description</dt>
            <dd className="mt-1 max-w-prose space-y-5 text-sm text-gray-900">
              {profile.description}
            </dd>
          </div>
        )}
      </dl>
      {profile && <Json className="mb-3" label="Profile" value={profile} />}
      <Json className="mb-3" label="Repo" value={repo} />
    </div>
  )
}

function Posts({
  id,
  onReport,
}: {
  id: string
  onReport: (uri: string) => void
}) {
  return <AuthorFeed title="" id={id} onReport={onReport} />
}

function Follows({ id }: { id: string }) {
  const { error, data: follows } = useQuery({
    queryKey: ['follows', { id }],
    queryFn: async () => {
      const { data } = await client.api.app.bsky.graph.getFollows({ user: id })
      return data
    },
  })
  return (
    <div>
      <AccountsGrid error={String(error ?? '')} accounts={follows?.follows} />
    </div>
  )
}

function Followers({ id }: { id: string }) {
  const { error, data: followers } = useQuery({
    queryKey: ['followers', { id }],
    queryFn: async () => {
      const { data } = await client.api.app.bsky.graph.getFollowers({
        user: id,
      })
      return data
    },
  })
  return (
    <div>
      <AccountsGrid
        error={String(error ?? '')}
        accounts={followers?.followers}
      />
    </div>
  )
}

function Reports({
  reports,
}: {
  reports: GetRepo.OutputSchema['moderation']['reports']
}) {
  return (
    <ReportsTable
      reports={reports}
      showLoadMore={false}
      onLoadMore={() => null}
    />
  )
}

type FollowOrFollower = GetFollows.Follow | GetFollowers.Follower
function AccountsGrid({
  error,
  accounts,
}: {
  error: string
  accounts?: FollowOrFollower[]
}) {
  if (!accounts) {
    return (
      <div className="py-8 mx-auto max-w-5xl px-4 sm:px-6 lg:px-12 text-xl">
        Loading...
      </div>
    )
  }
  return (
    <div className="mx-auto mt-8 max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
      <div className="mt-1 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {accounts.map((account) => (
          <div
            key={account.handle}
            className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm focus-within:ring-2 focus-within:ring-pink-500 focus-within:ring-offset-2 hover:border-gray-400"
          >
            <div className="flex-shrink-0">
              <img
                className="h-10 w-10 rounded-full"
                src={
                  typeof account.avatar === 'string'
                    ? account.avatar
                    : '/img/default-avatar.jpg'
                }
                alt=""
              />
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={`/repositories/${account.handle}`}
                className="focus:outline-none"
              >
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">
                  {account.displayName || `@${account.handle}`}
                </p>
                <p className="truncate text-sm text-gray-500">
                  @{account.handle}
                </p>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
