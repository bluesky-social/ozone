'use client'

import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { AppBskyActorDefs } from '@atproto/api'
import { useQuery } from '@tanstack/react-query'
import { XMarkIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export interface ModeratorBadgeProps {
  did: string
  profile?:
    | AppBskyActorDefs.ProfileView
    | AppBskyActorDefs.ProfileViewBasic
    | AppBskyActorDefs.ProfileViewDetailed
  onRemove?: () => void
}

/**
 * Display a user as a chip linking to their repository page. Attempts to
 * enrich with profile data if not provided. When `onRemove` is passed, a
 * remove button is revealed on hover.
 */
export function ModeratorBadge({
  did,
  profile: profileProp,
  onRemove,
}: ModeratorBadgeProps) {
  const labelerAgent = useLabelerAgent()
  const { data: fetchedProfile } = useQuery({
    queryKey: ['user', did],
    queryFn: async () => {
      const { data } = await labelerAgent.app.bsky.actor.getProfile({
        actor: did,
      })
      return data
    },
    enabled: !profileProp,
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })

  const profile = profileProp ?? fetchedProfile

  const displayLabel =
    profile?.displayName || profile?.handle || `${did.slice(0, 20)}...`

  return (
    <span className="w-fit group/badge inline-flex items-center gap-1 rounded bg-gray-100 dark:bg-slate-700 px-2 py-1 text-xs text-gray-700 dark:text-gray-200">
      <Link
        href={`/repositories/${did}`}
        className="inline-flex items-center gap-1 hover:underline"
      >
        <img
          className="h-4 w-4 rounded-full"
          src={profile?.avatar || '/img/default-avatar.jpg'}
          alt=""
        />
        {displayLabel}
      </Link>
      {onRemove && (
        <button
          onClick={onRemove}
          title="Unassign moderator"
          className="hidden group-hover/badge:inline-flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-100"
        >
          <XMarkIcon className="h-3 w-3" />
        </button>
      )}
    </span>
  )
}
