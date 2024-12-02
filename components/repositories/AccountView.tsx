'use client'
import { Alert } from '@/common/Alert'
import { ActionButton, ButtonGroup, LinkButton } from '@/common/buttons'
import { DataField } from '@/common/DataField'
import { Dropdown, DropdownItem } from '@/common/Dropdown'
import { EmptyDataset } from '@/common/feeds/EmptyFeed'
import { CheckboxesModal } from '@/common/modals/checkboxes'
import { Tabs, TabView } from '@/common/Tabs'
import { InviteCodesTable } from '@/invites/InviteCodesTable'
import { buildBlueSkyAppUrl, truncate } from '@/lib/util'
import { ModEventList } from '@/mod-event/EventList'
import { getProfileUriForDid } from '@/reports/helpers/subject'
import { useLabelerAgent, usePermission } from '@/shell/ConfigurationContext'
import { SubjectReviewStateBadge } from '@/subject/ReviewStateMarker'
import {
  useWorkspaceAddItemsMutation,
  useWorkspaceList,
  useWorkspaceRemoveItemsMutation,
} from '@/workspace/hooks'
import {
  AppBskyActorDefs,
  ComAtprotoAdminDefs,
  AppBskyActorGetProfile as GetProfile,
  ToolsOzoneModerationGetRepo as GetRepo,
} from '@atproto/api'
import {
  ArrowTopRightOnSquareIcon,
  ChevronLeftIcon,
  EnvelopeIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  MagnifyingGlassPlusIcon,
  UserCircleIcon,
  XCircleIcon,
} from '@heroicons/react/20/solid'
import { useQuery } from '@tanstack/react-query'
import { EmailComposer } from 'components/email/Composer'
import { useEmailRecipientStatus } from 'components/email/useEmailRecipientStatus'
import { Followers } from 'components/graph/Followers'
import { Follows } from 'components/graph/Follows'
import { Lists } from 'components/list/Lists'
import { RelatedAccounts } from 'components/signature/RelatedAccounts'
import { SubjectTag } from 'components/tags/SubjectTag'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ComponentProps, useCallback, useEffect, useState } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import { AuthorFeed } from '../common/feeds/AuthorFeed'
import { Json } from '../common/Json'
import {
  getLabelsForSubject,
  LabelChip,
  LabelList,
  LabelListEmpty,
  ModerationLabel,
} from '../common/labels'
import { Loading, LoadingFailed } from '../common/Loader'
import { ReportPanel } from '../reports/ReportPanel'
import { Blocks } from './Blocks'
import { DidHistory } from './DidHistory'
import { InviteCodeGenerationStatus } from './InviteCodeGenerationStatus'
import { MuteReporting } from './MuteReporting'
import { ProfileAvatar } from './ProfileAvatar'

enum Views {
  Details,
  Posts,
  Follows,
  Followers,
  Invites,
  Blocks,
  Events,
  Email,
  Lists,
  RelatedAccounts,
}

const TabKeys = {
  details: Views.Details,
  posts: Views.Posts,
  follows: Views.Follows,
  followers: Views.Followers,
  lists: Views.Lists,
  invites: Views.Invites,
  blocks: Views.Blocks,
  events: Views.Events,
  email: Views.Email,
  related: Views.RelatedAccounts,
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

  const canSendEmail = usePermission('canSendEmail')

  const getTabViews = () => {
    const numInvited = (repo?.invites || []).reduce(
      (acc, invite) => acc + invite.uses.length,
      0,
    )

    const views: TabView<Views>[] = [{ view: Views.Details, label: 'Profile' }]
    if (profile) {
      views.push(
        {
          view: Views.Posts,
          label: 'Posts',
          sublabel: String(profile.postsCount),
        },
        {
          view: Views.Follows,
          label: 'Follows',
          sublabel: String(profile.followsCount),
        },
        {
          view: Views.Followers,
          label: 'Followers',
          sublabel: String(profile.followersCount),
        },
        {
          view: Views.Blocks,
          label: 'Blocks',
        },
        {
          view: Views.RelatedAccounts,
          label: 'Related',
        },
      )

      if (profile.associated?.lists) {
        views.push({
          view: Views.Lists,
          label: 'Lists',
          sublabel: String(profile.associated.lists),
        })
      }
    }
    views.push(
      { view: Views.Invites, label: 'Invites', sublabel: String(numInvited) },
      { view: Views.Events, label: 'Events' },
    )

    if (canSendEmail) {
      views.push({ view: Views.Email, label: 'Email' })
    }

    return views
  }

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
                    views={getTabViews()}
                    onSetCurrentView={setCurrentView}
                  />
                  {currentView === Views.Details && (
                    <Details profile={profile} repo={repo} id={id} />
                  )}
                  {currentView === Views.Posts && (
                    <Posts id={id} onReport={setReportUri} />
                  )}
                  {currentView === Views.Follows && (
                    <Follows count={profile?.followsCount} id={id} />
                  )}
                  {currentView === Views.Followers && (
                    <Followers count={profile?.followersCount} id={id} />
                  )}
                  {currentView === Views.Lists && <Lists actor={id} />}
                  {currentView === Views.RelatedAccounts && (
                    <RelatedAccounts id={id} />
                  )}
                  {currentView === Views.Invites && <Invites repo={repo} />}
                  {currentView === Views.Blocks && <Blocks did={id} />}
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

function ProfileHeaderImage({
  profile,
}: {
  profile?: GetProfile.OutputSchema
}) {
  const alt = `Banner image for ${
    profile?.displayName || profile?.handle || 'user'
  }`
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
    }
  }
  const image = (
    <img
      className="h-32 w-full object-cover lg:h-48"
      src={profile?.banner || '/img/default-banner.jpg'}
      alt={alt}
    />
  )

  if (!profile?.banner) {
    return <div>{image}</div>
  }

  return (
    <div>
      <Lightbox
        open={isImageViewerOpen}
        carousel={{ finite: true }}
        controller={{ closeOnBackdropClick: true }}
        close={() => setIsImageViewerOpen(false)}
        slides={[
          {
            src: profile.banner,
            description: alt,
          },
        ]}
        on={{
          // The lightbox may open from other Dialog/modal components
          // in that case, we want to make sure that esc button presses
          // only close the lightbox and not the parent Dialog/modal underneath
          entered: () => {
            document.addEventListener('keydown', handleKeyDown)
          },
          exited: () => {
            document.removeEventListener('keydown', handleKeyDown)
          },
        }}
      />
      <button
        type="button"
        className="w-full active:outline-none"
        onClick={() => setIsImageViewerOpen(true)}
      >
        {image}
      </button>
    </div>
  )
}

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
  const { mutate: addToWorkspace } = useWorkspaceAddItemsMutation()
  const { mutate: removeFromWorkspace } = useWorkspaceRemoveItemsMutation()
  const { data: workspaceList } = useWorkspaceList()
  const { subjectStatus } = repo?.moderation ?? {}
  const displayActorName = repo
    ? profile?.displayName
      ? `${truncate(profile.displayName, 20)} @${truncate(repo.handle, 20)}`
      : `@${repo.handle}`
    : id.startsWith('did:')
    ? id
    : `@${id}`
  const [isMuteReportingOpen, setIsMuteReportingOpen] = useState(false)
  const isReportingMuted =
    !!subjectStatus?.muteReportingUntil &&
    new Date(subjectStatus.muteReportingUntil) > new Date()
  const reportOptions: DropdownItem[] = []
  if (repo) {
    reportOptions.push({
      text: 'Report Account',
      onClick: () => onReport(repo.did),
    })
    if (!isReportingMuted) {
      reportOptions.push({
        text: 'Mute Reporting',
        onClick: () => setIsMuteReportingOpen(true),
      })
    } else {
      reportOptions.push({
        text: 'Unmute Reporting',
        onClick: () => {
          setIsMuteReportingOpen(true)
        },
      })
    }

    if (!workspaceList?.includes(repo.did)) {
      reportOptions.push({
        text: 'Add to workspace',
        onClick: () => addToWorkspace([repo.did]),
      })
    } else {
      reportOptions.push({
        text: 'Remove from workspace',
        onClick: () => removeFromWorkspace([repo.did]),
      })
    }
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
      {(repo?.did || profile?.did) && (
        <MuteReporting
          isOpen={isMuteReportingOpen}
          setIsOpen={setIsMuteReportingOpen}
          isReportingMuted={isReportingMuted}
          did={`${repo?.did || profile?.did}`}
        />
      )}
      <ProfileHeaderImage profile={profile} />
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

function Details({
  profile,
  repo,
  id,
}: {
  profile?: GetProfile.OutputSchema
  repo: GetRepo.OutputSchema
  id: string
}) {
  const router = useRouter()
  const labels = getLabelsForSubject({ repo })
  const tags = repo.moderation.subjectStatus?.tags || []
  const canShowDidHistory = repo.did.startsWith('did:plc')
  const deactivatedAt = repo.deactivatedAt
    ? dateFormatter.format(new Date(repo.deactivatedAt))
    : ''

  const { registrationIp, lastSigninIp, lastSigninTime, hcapDetail } =
    parseThreatSigs(repo.threatSignatures)

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
        {registrationIp && (
          <DataField
            value={registrationIp}
            label="Registration IP"
            showCopyButton
          >
            {obscureIp(registrationIp)}{' '}
            <Link
              href={`/repositories?term=sig:${encodeURIComponent(
                registrationIp,
              )}`}
            >
              <MagnifyingGlassIcon className="h-3 w-3 inline" />
            </Link>
          </DataField>
        )}
        {lastSigninIp && (
          <DataField value={lastSigninIp} label="Last Signin IP" showCopyButton>
            {obscureIp(lastSigninIp)}{' '}
            <Link
              href={`/repositories?term=sig:${encodeURIComponent(
                lastSigninIp,
              )}`}
            >
              <MagnifyingGlassIcon className="h-3 w-3 inline" />
            </Link>
            {lastSigninTime && (
              <div className="text-gray-400">
                {new Date(lastSigninTime).toLocaleString()}
              </div>
            )}
          </DataField>
        )}
        {hcapDetail && (
          <DataField label="Hcaptcha">
            {hcapDetail?.map(({ property, value }) => (
              <Link
                key={property}
                href={`/repositories?term=sig:${encodeURIComponent(value)}`}
              >
                <LabelChip>
                  <MagnifyingGlassIcon className="h-3 w-3 inline" />
                  {property}
                </LabelChip>
              </Link>
            ))}

            {repo.threatSignatures?.length && (
              <CheckboxesModal<ComAtprotoAdminDefs.ThreatSignature>
                title="Find accounts matching the following signatures"
                items={repo.threatSignatures}
                itemLabel={(signature) => signature.property}
                required
                onConfirm={(values) => {
                  router.push(
                    `/repositories?term=sig:${encodeURIComponent(
                      // "getRepos" supports JSON encoded array of string for "sig:" searches
                      JSON.stringify(values.map((s) => s.value)),
                    )}`,
                  )
                }}
              >
                <MagnifyingGlassPlusIcon className="ml-2 h-3 w-3 inline" />
              </CheckboxesModal>
            )}
          </DataField>
        )}
        <DataField
          label="Email Verification"
          value={
            repo.emailConfirmedAt
              ? `At ${dateFormatter.format(new Date(repo.emailConfirmedAt))}`
              : 'Not verified'
          }
        />
        {deactivatedAt && (
          <DataField
            label="Account Deactivated"
            value={`At ${deactivatedAt}`}
          />
        )}
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
              <ModerationLabel
                label={label}
                key={label.val}
                recordAuthorDid={repo.did}
              />
            ))}
          </LabelList>
        </DataField>
        <DataField label="Tags">
          <LabelList>
            {!tags.length && <LabelListEmpty />}
            {tags.map((tag) => (
              <SubjectTag key={tag} tag={tag} />
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
  return <AuthorFeed id={id} onReport={onReport} />
}

function Invites({ repo }: { repo: GetRepo.OutputSchema }) {
  const labelerAgent = useLabelerAgent()
  const {
    error,
    isLoading,
    data: invitedUsers,
  } = useQuery({
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
      const { data } = await labelerAgent.api.app.bsky.actor.getProfiles({
        actors,
      })
      return data
    },
  })

  const onClickRevoke = useCallback(async () => {
    if (!confirm('Are you sure you want to revoke their invite codes?')) {
      return
    }
    await labelerAgent.api.com.atproto.admin.disableInviteCodes({
      accounts: [repo.did],
    })
  }, [labelerAgent, repo.did])

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
          isLoading={isLoading}
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
  isLoading,
  accounts,
}: {
  error: string
  isLoading?: boolean
  accounts?: FollowOrFollower[]
}) {
  if (isLoading) {
    return (
      <div className="py-8 mx-auto max-w-5xl px-4 sm:px-6 lg:px-12 text-xl dark:text-gray-300">
        Loading...
      </div>
    )
  }
  return (
    <div className="mx-auto mt-8 max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
      {!!error && (
        <div className="mt-1 dark:text-gray-300">
          <p>{error}</p>
        </div>
      )}
      <div className="mt-1 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {accounts?.map((account) => (
          <ProfileCard profile={account} key={account.handle} />
        ))}
      </div>
    </div>
  )
}

export const ProfileCard = ({
  profile,
}: {
  profile: AppBskyActorDefs.ProfileView | AppBskyActorDefs.ProfileViewBasic
}) => {
  return (
    <div className="relative flex items-center space-x-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-5 shadow-sm dark:shadow-slate-800 focus-within:ring-2 focus-within:ring-pink-500 focus-within:ring-teal-500 focus-within:ring-offset-2 hover:border-gray-400 dark:hover:border-slate-700">
      <div className="flex-shrink-0">
        <ProfileAvatar className="h-10 w-10 rounded-full" profile={profile} />
      </div>
      <div className="min-w-0 flex-1">
        <Link
          href={`/repositories/${profile.did}`}
          className="focus:outline-none"
        >
          <span className="absolute inset-0" aria-hidden="true" />
          <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
            {profile.displayName || `@${profile.handle}`}
          </p>
          <p className="truncate text-sm text-gray-500 dark:text-gray-50">
            @{profile.handle}
          </p>
        </Link>
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
  const { cantReceive } = useEmailRecipientStatus(props.did)
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
      {cantReceive && (
        <div className="my-2">
          <Alert
            showIcon
            type="warning"
            title="Can not send email to this user"
            body="This user's account is hosted on PDS that does not allow sending emails. Please check the PDS of the user to verify."
          />
        </div>
      )}
      <EmailComposer {...props} />
    </div>
  )
}

function obscureIp(ip: string) {
  const parts = ip.split('.')
  if (parts.length !== 4) return '***.***.***.***'
  return `${parts[0]}.${parts[1]}.***.***`
}

function parseThreatSigs(sigs?: ComAtprotoAdminDefs.ThreatSignature[]) {
  const registrationIp = sigs?.find(
    (sig) => sig.property === 'registrationIp',
  )?.value
  const lastSigninIp = sigs?.find(
    (sig) => sig.property === 'lastSigninIp',
  )?.value
  const lastSigninTime = sigs?.find(
    (sig) => sig.property === 'lastSigninTime',
  )?.value
  const hcapDetail = sigs?.filter(
    (sig) =>
      !['registrationIp', 'lastSigninIp', 'lastSigninTime'].includes(
        sig.property,
      ),
  )
  return { registrationIp, lastSigninIp, lastSigninTime, hcapDetail }
}
