'use client'
import { ComponentProps, useEffect, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  AppBskyActorGetProfile as GetProfile,
  ComAtprotoAdminGetRepo as GetRepo,
  AppBskyActorDefs,
} from '@atproto/api'
import {
  ArrowTopRightOnSquareIcon,
  ChevronLeftIcon,
  EnvelopeIcon,
  ExclamationCircleIcon,
  UserCircleIcon,
  XCircleIcon,
} from '@heroicons/react/20/solid'
import { AuthorFeed } from '../common/feeds/AuthorFeed'
import { Json } from '../common/Json'
import { buildBlueSkyAppUrl, classNames, truncate } from '@/lib/util'
import client from '@/lib/client'
import { ReportPanel } from '../reports/ReportPanel'
import React from 'react'
import {
  LabelChip,
  LabelList,
  LabelListEmpty,
  displayLabel,
  toLabelVal,
  getLabelsForSubject,
} from '../common/labels'
import { Loading, LoadingFailed } from '../common/Loader'
import { InviteCodeGenerationStatus } from './InviteCodeGenerationStatus'
import { InviteCodesTable } from '@/invites/InviteCodesTable'
import { Dropdown, DropdownItem } from '@/common/Dropdown'
import { getProfileUriForDid } from '@/reports/helpers/subject'
import { EmailComposer } from 'components/email/Composer'
import { DataField } from '@/common/DataField'
import { ProfileAvatar } from './ProfileAvatar'
import { DidHistory } from './DidHistory'
import { ModEventList } from '@/mod-event/EventList'
import { ActionButton, ButtonGroup, LinkButton } from '@/common/buttons'
import { SubjectReviewStateBadge } from '@/subject/ReviewStateMarker'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { EmptyDataset } from '@/common/feeds/EmptyFeed'

enum Views {
  Details,
  Posts,
  Follows,
  Followers,
  Invites,
  Events,
  Email,
}

const TabKeys = {
  details: Views.Details,
  posts: Views.Posts,
  follows: Views.Follows,
  followers: Views.Followers,
  invites: Views.Invites,
  events: Views.Events,
  email: Views.Email,
}

export function AccountView({
  repo,
  profile,
  error,
  id,
  onSubmit,
  onShowActionPanel,
}: {
  id: string
  repo?: GetRepo.OutputSchema
  profile?: GetProfile.OutputSchema
  error?: unknown
  onSubmit: (vals: any) => Promise<void>
  onShowActionPanel: (subject: string) => void
}) {
  const searchParams = useSearchParams()
  const currentView =
    TabKeys[searchParams.get('tab') || 'details'] || TabKeys.details
  const setCurrentView = (view: Views) => {
    const newParams = new URLSearchParams(searchParams)
    const newTab = Object.entries(TabKeys).find(([, v]) => v === view)?.[0]
    newParams.set('tab', newTab || 'details')
    router.push((pathname ?? '') + '?' + newParams.toString())
  }
  const pathname = usePathname()
  const router = useRouter()
  const reportUri = searchParams.get('reportUri') || undefined
  const setReportUri = (uri?: string) => {
    const newParams = new URLSearchParams(searchParams)
    if (uri) {
      newParams.set('reportUri', uri)
    } else {
      newParams.delete('reportUri')
    }
    router.push((pathname ?? '') + '?' + newParams.toString())
  }

  useEffect(() => {
    if (reportUri === 'default' && (repo || profile)) {
      setReportUri(repo?.did || profile?.did)
    }
  }, [repo, reportUri])

  return (
    <div className="flex h-full bg-white dark:bg-slate-900">
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
                className="inline-flex items-center space-x-3 text-sm font-medium text-gray-900 dark:text-gray-200"
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
                onShowActionPanel={onShowActionPanel}
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
                    <Details profile={profile} repo={repo} id={id} />
                  )}
                  {currentView === Views.Posts && (
                    <Posts id={id} onReport={setReportUri} />
                  )}
                  {currentView === Views.Follows && <Follows id={id} />}
                  {currentView === Views.Followers && <Followers id={id} />}
                  {currentView === Views.Invites && <Invites repo={repo} />}
                  {currentView === Views.Events && (
                    <EventsView did={repo.did} />
                  )}
                  {currentView === Views.Email && <EmailView did={repo.did} />}
                </>
              ) : (
                <div className="py-8 mx-auto max-w-5xl px-4 sm:px-6 lg:px-12 text-xl">
                  {error ? <LoadingFailed error={error} /> : <Loading />}
                </div>
              )}
            </article>
          </main>
        </div>
      </div>
    </div>
  )
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function Header({
  id,
  repo,
  profile,
  onReport,
  onShowActionPanel,
}: {
  id: string
  repo?: GetRepo.OutputSchema
  profile?: GetProfile.OutputSchema
  onReport: (did: string) => void
  onShowActionPanel: (subject: string) => void
}) {
  const { subjectStatus } = repo?.moderation ?? {}
  const displayActorName = repo
    ? profile?.displayName
      ? `${truncate(profile.displayName, 20)} @${truncate(repo.handle, 20)}`
      : `@${repo.handle}`
    : id.startsWith('did:')
    ? id
    : `@${id}`
  const reportOptions: DropdownItem[] = []
  if (repo) {
    reportOptions.push({
      text: 'Report Account',
      onClick: () => onReport(repo.did),
    })
  }
  if (profile) {
    reportOptions.push({
      text: 'Report Profile',
      onClick: () => onReport(getProfileUriForDid(profile.did)),
    })
  }

  if (repo?.did || profile?.did) {
    reportOptions.push({
      text: 'Show Action Panel',
      onClick: () => onShowActionPanel(`${repo?.did || profile?.did}`),
    })
  }

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
            <ProfileAvatar
              className="h-24 w-24 rounded-full ring-4 ring-white sm:h-32 sm:w-32"
              {...{ profile, repo }}
            />
          </div>
          <div className="mt-6 sm:flex sm:min-w-0 sm:flex-1 sm:items-center sm:justify-end sm:space-x-6 sm:pb-1">
            <div className="mt-6 min-w-0 flex-1 sm:hidden 2xl:block">
              <h1 className="truncate text-2xl font-bold text-gray-900 dark:text-gray-200">
                <a
                  href={buildBlueSkyAppUrl({
                    did: repo?.did || profile?.did || '',
                  })}
                  target="_blank"
                >
                  {displayActorName}
                </a>{' '}
                {subjectStatus && (
                  <SubjectReviewStateBadge subjectStatus={subjectStatus} />
                )}
              </h1>
            </div>
            <div className="justify-stretch mt-6 flex flex-row space-x-3">
              {repo?.email && (
                <a
                  role="button"
                  href={`mailto:${repo.email}`}
                  title={
                    repo.emailConfirmedAt
                      ? `Email verified at ${dateFormatter.format(
                          new Date(repo.emailConfirmedAt),
                        )}`
                      : 'Email not verified'
                  }
                  className={`inline-flex justify-center rounded-md border ${
                    repo.emailConfirmedAt
                      ? 'border-green-600'
                      : 'border-gray-300'
                  } bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-100 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2`}
                >
                  <EnvelopeIcon
                    className={`-ml-1 mr-2 h-5 w-5  ${
                      repo.emailConfirmedAt ? 'text-green-600' : 'text-gray-400'
                    }`}
                    aria-hidden="true"
                  />
                  <span>Email Account</span>
                </a>
              )}
              {!!reportOptions.length && (
                <Dropdown
                  className="inline-flex justify-center rounded-md border border-gray-300 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-100 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
                  items={reportOptions}
                >
                  <ExclamationCircleIcon
                    className="-ml-1 mr-2 h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                  <span>Take Action</span>
                </Dropdown>
              )}
            </div>
          </div>
        </div>
        <div className="mt-6 hidden min-w-0 flex-1 sm:block 2xl:hidden">
          <h1 className="truncate text-2xl font-bold text-gray-900 dark:text-gray-200">
            <a
              href={buildBlueSkyAppUrl({
                did: repo?.did || profile?.did || '',
              })}
              target="_blank"
            >
              {displayActorName}
            </a>{' '}
            {subjectStatus && (
              <SubjectReviewStateBadge subjectStatus={subjectStatus} />
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
          ? 'border-pink-500 dark:border-teal-400 text-gray-900 dark:text-teal-500'
          : 'border-transparent text-gray-500 dark:text-gray-50 hover:text-gray-700 dark:hover:text-teal-200 hover:border-gray-300 dark:hover:border-teal-300',
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

  const numInvited = (repo.invites || []).reduce(
    (acc, invite) => acc + invite.uses.length,
    0,
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
              view={Views.Invites}
              label="Invites"
              sublabel={String(numInvited)}
            />
            <Tab view={Views.Events} label="Events" />
            <Tab view={Views.Email} label="Email" />
          </nav>
        </div>
      </div>
    </div>
  )
}

function Details({
  profile,
  repo,
  id,
}: {
  profile?: GetProfile.OutputSchema
  repo: GetRepo.OutputSchema
  id: string
}) {
  const labels = getLabelsForSubject({ repo }).map((label) =>
    toLabelVal(label, repo.did),
  )
  const canShowDidHistory = repo.did.startsWith('did:plc')
  return (
    <div className="mx-auto mt-6 max-w-5xl px-4 sm:px-6 lg:px-8">
      <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 mb-10">
        <DataField label="Handle" value={repo.handle} showCopyButton />
        <DataField label="DID" value={repo.did} showCopyButton />
        {profile?.displayName && (
          <DataField
            label="Display Name"
            value={profile.displayName}
            showCopyButton
          />
        )}
        <DataField
          label="Email Verification"
          value={
            repo.emailConfirmedAt
              ? `At ${dateFormatter.format(new Date(repo.emailConfirmedAt))}`
              : 'Not verified'
          }
        />
        {profile?.description && (
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-50">
              Description
            </dt>
            <dd className="mt-1 max-w-prose space-y-5 text-sm text-gray-900 dark:text-gray-200">
              {profile.description}
            </dd>
          </div>
        )}
        <DataField label="Labels">
          <LabelList>
            {!labels.length && <LabelListEmpty />}
            {labels.map((label) => (
              <LabelChip key={label}>{displayLabel(label)}</LabelChip>
            ))}
          </LabelList>
        </DataField>
        <DataField label="Invited by">
          {repo.invitedBy?.forAccount ? (
            <Link
              href={`/repositories/${repo.invitedBy?.forAccount}`}
              className="focus:outline-none"
            >
              {repo.invitedBy.forAccount}
            </Link>
          ) : (
            '(Admin)'
          )}
        </DataField>
        <InviteCodeGenerationStatus
          id={id}
          did={repo.did}
          inviteNote={repo.inviteNote}
          invitesDisabled={repo.invitesDisabled}
        />
      </dl>
      {canShowDidHistory && <DidHistory did={repo.did} />}
      {profile && (
        <Json
          className="mb-3"
          label={
            <>
              <span className="mr-1">Profile</span>
              <Link
                className="underline"
                href={`/repositories/${repo.did}/app.bsky.actor.profile/self`}
              >
                (view record)
              </Link>
            </>
          }
          value={profile}
        />
      )}
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
      const { data } = await client.api.app.bsky.graph.getFollows(
        { actor: id },
        { headers: client.adminHeaders() },
      )
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
      const { data } = await client.api.app.bsky.graph.getFollowers(
        {
          actor: id,
        },
        { headers: client.adminHeaders() },
      )
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

function Invites({ repo }: { repo: GetRepo.OutputSchema }) {
  const { error, data: invitedUsers } = useQuery({
    queryKey: ['invitedUsers', { id: repo.did }],
    queryFn: async () => {
      const actors: string[] = []
      if (repo.invites?.length) {
        for (const invite of repo.invites) {
          for (const use of invite.uses) {
            actors.push(use.usedBy)
          }
        }
      }
      if (actors.length === 0) {
        return { profiles: [] }
      }
      const { data } = await client.api.app.bsky.actor.getProfiles({
        actors,
      })
      return data
    },
  })

  const onClickRevoke = React.useCallback(async () => {
    if (!confirm('Are you sure you want to revoke their invite codes?')) {
      return
    }
    await client.api.com.atproto.admin.disableInviteCodes(
      {
        accounts: [repo.did],
      },
      { encoding: 'application/json', headers: client.adminHeaders() },
    )
  }, [client])

  return (
    <div>
      <div className="mx-auto mt-8 max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <ActionButton appearance="primary" onClick={onClickRevoke}>
            <XCircleIcon
              className="-ml-1 mr-2 h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
            <span>Revoke unused invite codes</span>
          </ActionButton>
        </div>
        <h3 className="text-xl font-medium text-black dark:text-gray-200">
          Invited users
        </h3>
      </div>
      {!invitedUsers?.length ? (
        <EmptyDataset message="No invited users found" />
      ) : (
        <AccountsGrid
          error={String(error ?? '')}
          accounts={invitedUsers?.profiles}
        />
      )}
      <div className="mx-auto mt-8 max-w-5xl px-4 sm:px-6 lg:px-8">
        <h3 className="text-xl font-medium text-black dark:text-gray-200">
          Invite codes
        </h3>
      </div>
      <div className="mb-20">
        {!!repo.invites?.length ? (
          <InviteCodesTable codes={repo.invites} />
        ) : (
          <EmptyDataset message="No invite codes found" />
        )}
      </div>
    </div>
  )
}

type FollowOrFollower = AppBskyActorDefs.ProfileView
export function AccountsGrid({
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
            className="relative flex items-center space-x-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-5 shadow-sm dark:shadow-slate-800 focus-within:ring-2 focus-within:ring-pink-500 focus-within:ring-teal-500 focus-within:ring-offset-2 hover:border-gray-400 dark:hover:border-slate-700"
          >
            <div className="flex-shrink-0">
              <ProfileAvatar
                className="h-10 w-10 rounded-full"
                profile={account}
              />
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={`/repositories/${account.handle}`}
                className="focus:outline-none"
              >
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
                  {account.displayName || `@${account.handle}`}
                </p>
                <p className="truncate text-sm text-gray-500 dark:text-gray-50">
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
enum EventViews {
  ByUser,
  ForUser,
}

export const EventsView = ({ did }: { did: string }) => {
  // We show reports loaded from repo view so separately showing loading state here is not necessary
  const [currentView, setCurrentView] = useState(EventViews.ForUser)

  return (
    <div>
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-500 py-2 px-4 sm:flex sm:items-center sm:justify-between sticky top-0 dark">
        <div />

        <div className="sm:flex mt-3 sm:mt-0 sm:ml-4">
          <ButtonGroup
            size="xs"
            appearance="primary"
            items={[
              {
                id: 'By User',
                text: 'By User',
                Icon: UserCircleIcon,
                isActive: currentView === EventViews.ByUser,
                onClick: () => setCurrentView(EventViews.ByUser),
              },
              {
                id: 'For User',
                text: 'For User',
                Icon: ExclamationCircleIcon,
                isActive: currentView === EventViews.ForUser,
                onClick: () => setCurrentView(EventViews.ForUser),
              },
            ]}
          />
        </div>
      </div>
      <div className="pt-4 max-w-3xl w-full mx-auto dark:text-gray-100">
        <ModEventList
          {...(currentView === EventViews.ByUser
            ? { createdBy: did }
            : { subject: did })}
        />
      </div>
    </div>
  )
}

const EmailView = (props: ComponentProps<typeof EmailComposer>) => {
  return (
    <div className="mx-auto mt-8 max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
      <div className="flex flex-row justify-end items-center">
        <LinkButton
          prefetch={false}
          href="/communication-template"
          appearance="primary"
          size="sm"
        >
          Manage Templates
          <ArrowTopRightOnSquareIcon className="inline-block h-4 w-4 ml-1" />
        </LinkButton>
      </div>
      <EmailComposer {...props} />
    </div>
  )
}
