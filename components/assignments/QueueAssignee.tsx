'use client'

import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useQuery } from '@tanstack/react-query'

interface QueueAssigneeProps {
  did: string
}

export function QueueAssignee({ did }: QueueAssigneeProps) {
  const labelerAgent = useLabelerAgent()
  const { data: profile } = useQuery({
    queryKey: ['profile', did],
    queryFn: async () => {
      const { data } = await labelerAgent.app.bsky.actor.getProfile({
        actor: did,
      })
      return data
    },
    refetchOnWindowFocus: false,
  })

  const displayLabel =
    profile?.displayName || profile?.handle || `${did.slice(0, 20)}...`

  return (
    <span className="group inline-flex items-center gap-1 rounded bg-gray-100 dark:bg-slate-700 px-2 py-0.5 text-xs text-gray-700 dark:text-gray-200">
      {displayLabel}
    </span>
  )
}
