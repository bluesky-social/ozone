'use client'

import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { UserGroupIcon } from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useLabelerAgent } from '../shell/ConfigurationContext'
import { useOnlineModerators } from './useOnlineModerators'

export function OnlineModeratorsIndicator() {
  const { data: onlineModerators = [] } = useOnlineModerators()

  return (
    <Popover className="relative">
      <PopoverButton className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500">
        <span className="sr-only">{onlineModerators.length} online</span>
        <div className="relative">
          <UserGroupIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 ring-1 ring-white dark:ring-slate-900" />
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {onlineModerators.length}
        </span>
      </PopoverButton>

      <PopoverPanel className="absolute right-0 z-10 mt-2 w-64 origin-top-right rounded-md bg-white dark:bg-slate-900 py-2 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
        <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-700">
          {onlineModerators.length} online
        </div>
        <div className="max-h-96 overflow-y-auto">
          {onlineModerators.map((mod) => (
            <ModeratorListItem
              key={mod.did}
              did={mod.did}
              lastActive={mod.lastActive}
            />
          ))}
        </div>
      </PopoverPanel>
    </Popover>
  )
}

function ModeratorListItem({
  did,
  lastActive,
}: {
  did: string
  lastActive: Date
}) {
  const labelerAgent = useLabelerAgent()
  const { data: profile } = useQuery({
    queryKey: ['moderator-profile', did],
    queryFn: async () => {
      const { data } = await labelerAgent.app.bsky.actor.getProfile({
        actor: did,
      })
      return data
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const displayName = profile?.displayName || profile?.handle || did
  const handle = profile?.handle
  const avatar = profile?.avatar

  const activeFor = getActiveFor(lastActive)

  return (
    <Link
      href={`/repositories/${did}`}
      className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-800"
    >
      <img
        className="h-6 w-6 rounded-full"
        src={avatar || '/img/default-avatar.jpg'}
        alt=""
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {displayName}
        </div>
        {handle && displayName !== handle && (
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
            @{handle}
          </div>
        )}
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {activeFor}
        </div>
      </div>
    </Link>
  )
}

function getActiveFor(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  const minutes = Math.floor(seconds / 60)

  if (minutes < 1) return 'Active for less than a minute'
  if (minutes === 1) return 'Active for 1 minute'
  return `Active for ${minutes} minutes`
}
