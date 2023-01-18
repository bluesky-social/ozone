'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  AppBskyActorGetProfile as GetProfile,
  AppBskyGraphGetFollows as GetFollows,
  AppBskyGraphGetFollowers as GetFollowers,
} from '@atproto/api'
import {
  ChevronLeftIcon,
  EnvelopeIcon,
  PhoneIcon,
} from '@heroicons/react/20/solid'
import { AccountsSideList } from './AccountsSideList'
import { AuthorFeed } from '../common/feeds/AuthorFeed'
import { Json } from '../common/Json'
import { classNames } from '../../lib/util'
import { useApi } from '../../lib/client'

enum Views {
  Details,
  Posts,
  Follows,
  Followers,
}

const team = [
  {
    name: 'Leslie Alexander',
    handle: 'lesliealexander',
    role: 'Co-Founder / CEO',
    imageUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  },
  {
    name: 'Michael Foster',
    handle: 'michaelfoster',
    role: 'Co-Founder / CTO',
    imageUrl:
      'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  },
  {
    name: 'Dries Vincent',
    handle: 'driesvincent',
    role: 'Manager, Business Relations',
    imageUrl:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  },
  {
    name: 'Lindsay Walton',
    handle: 'lindsaywalton',
    role: 'Front-end Developer',
    imageUrl:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  },
]

export function AccountView({ id }: { id: string }) {
  const api = useApi()
  const [error, setError] = useState<string>('')
  const [currentView, setCurrentView] = useState<Views>(Views.Details)
  const [profile, setProfile] = useState<GetProfile.OutputSchema | undefined>(
    undefined,
  )

  useEffect(() => {
    let aborted = false

    if (api && profile?.did !== id && profile?.handle !== id) {
      setError('')
      api.app.bsky.actor.getProfile({ actor: id }).then(
        (res) => {
          if (!aborted) {
            setProfile(res.data)
          }
        },
        (err) => {
          console.error(err)
          if (!aborted) {
            setError(err.toString())
          }
        },
      )
    }

    return () => {
      aborted = true
    }
  }, [api, id, profile])

  return (
    <div className="flex h-full bg-white">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="relative z-0 flex flex-1 overflow-hidden">
          <main className="relative z-0 flex-1 overflow-y-auto focus:outline-none xl:order-last">
            <nav
              className="flex items-start px-4 py-3 sm:px-6 lg:px-8 xl:hidden"
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
              <Header id={id} profile={profile} />
              {profile ? (
                <>
                  <Tabs
                    currentView={currentView}
                    profile={profile}
                    onSetCurrentView={setCurrentView}
                  />
                  {currentView === Views.Details && (
                    <Details profile={profile} />
                  )}
                  {currentView === Views.Posts && <Posts id={id} />}
                  {currentView === Views.Follows && <Follows id={id} />}
                  {currentView === Views.Followers && <Followers id={id} />}
                </>
              ) : (
                <div className="py-8 mx-auto max-w-5xl px-4 sm:px-6 lg:px-12 text-xl">
                  Loading...
                </div>
              )}
            </article>
          </main>
          <AccountsSideList />
        </div>
      </div>
    </div>
  )
}

function Header({
  id,
  profile,
}: {
  id: string
  profile?: GetProfile.OutputSchema
}) {
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
                {profile?.displayName || `@${profile?.handle || id}`}
              </h1>
            </div>
            <div className="justify-stretch mt-6 flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4">
              <button
                type="button"
                className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
              >
                <EnvelopeIcon
                  className="-ml-1 mr-2 h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
                <span>Message</span>
              </button>
              <button
                type="button"
                className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
              >
                <PhoneIcon
                  className="-ml-1 mr-2 h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
                <span>Call</span>
              </button>
            </div>
          </div>
        </div>
        <div className="mt-6 hidden min-w-0 flex-1 sm:block 2xl:hidden">
          <h1 className="truncate text-2xl font-bold text-gray-900">
            {profile?.displayName || `@${profile?.handle || id}`}
          </h1>
        </div>
      </div>
    </div>
  )
}

function Tabs({
  currentView,
  profile,
  onSetCurrentView,
}: {
  currentView: Views
  profile: GetProfile.OutputSchema
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
            <Tab
              view={Views.Posts}
              label="Posts"
              sublabel={String(profile.postsCount)}
            />
            <Tab
              view={Views.Follows}
              label="Follows"
              sublabel={String(profile.followsCount)}
            />
            <Tab
              view={Views.Followers}
              label="Followers"
              sublabel={String(profile.followersCount)}
            />
          </nav>
        </div>
      </div>
    </div>
  )
}

function Details({ profile }: { profile: GetProfile.OutputSchema }) {
  const Field = ({ label, value }: { label: string; value: string }) => (
    <div className="sm:col-span-1">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value}</dd>
    </div>
  )
  return (
    <div className="mx-auto mt-6 max-w-5xl px-4 sm:px-6 lg:px-8">
      <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 mb-10">
        <Field label="Handle" value={profile.handle} />
        <Field label="DID" value={profile.did} />
        <Field label="Email" value="TODO" />
        <div className="sm:col-span-2">
          <dt className="text-sm font-medium text-gray-500">Description</dt>
          <dd className="mt-1 max-w-prose space-y-5 text-sm text-gray-900">
            {profile.description || ''}
          </dd>
        </div>
      </dl>
      <Json label="GetProfile()" value={profile} />
    </div>
  )
}

function Posts({ id }: { id: string }) {
  return <AuthorFeed title="" id={id} />
}

function Follows({ id }: { id: string }) {
  const api = useApi()
  const [error, setError] = useState<string>('')
  const [follows, setFollows] = useState<GetFollows.OutputSchema | undefined>(
    undefined,
  )

  useEffect(() => {
    let aborted = false

    if (api && !follows) {
      setError('')
      api.app.bsky.graph.getFollows({ user: id }).then(
        (res) => {
          if (!aborted) {
            setFollows(res.data)
          }
        },
        (err) => {
          console.error(err)
          if (!aborted) {
            setError(err.toString())
          }
        },
      )
    }

    return () => {
      aborted = true
    }
  }, [api, id, follows])

  return (
    <div>
      <AccountsGrid error={error} accounts={follows?.follows} />
    </div>
  )
}

function Followers({ id }: { id: string }) {
  const api = useApi()
  const [error, setError] = useState<string>('')
  const [followers, setFollowers] = useState<
    GetFollowers.OutputSchema | undefined
  >(undefined)

  useEffect(() => {
    let aborted = false

    if (api && !followers) {
      setError('')
      api.app.bsky.graph.getFollowers({ user: id }).then(
        (res) => {
          if (!aborted) {
            setFollowers(res.data)
          }
        },
        (err) => {
          console.error(err)
          if (!aborted) {
            setError(err.toString())
          }
        },
      )
    }

    return () => {
      aborted = true
    }
  }, [api, id, followers])

  return (
    <div>
      <AccountsGrid error={error} accounts={followers?.followers} />
    </div>
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
                src={account.avatar || '/img/default-avatar.jpg'}
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
