'use client'

import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { AppBskyActorDefs } from '@atproto/api'
import { useQuery } from '@tanstack/react-query'

export interface ModeratorBadgeProps {
  did: string
  profile?:
    | AppBskyActorDefs.ProfileView
    | AppBskyActorDefs.ProfileViewBasic
    | AppBskyActorDefs.ProfileViewDetailed
}

/** Display a user. Attempts to enrich with profile data if not provided. */
export function ModeratorBadge({ did, profile: profileProp }: ModeratorBadgeProps) {
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
    <span className="w-fit group inline-flex items-center gap-1 rounded bg-gray-100 dark:bg-slate-700 px-2 py-1 text-xs text-gray-700 dark:text-gray-200">
      <img
        className="h-4 w-4 rounded-full"
        src={profile?.avatar || '/img/default-avatar.jpg'}
        alt=""
      />
      {displayLabel}
    </span>
  )
}
