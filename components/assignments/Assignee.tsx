'use client'

import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useQuery } from '@tanstack/react-query'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface AssigneeProps {
  did: string
  onRemove?: () => void
}

export function Assignee({ did, onRemove }: AssigneeProps) {
  const labelerAgent = useLabelerAgent()
  const { data: profile } = useQuery({
    queryKey: ['assignee', did],
    queryFn: async () => {
      const { data } = await labelerAgent.app.bsky.actor.getProfile({
        actor: did,
      })
      return data
    },
  })

  const displayLabel =
    profile?.displayName || profile?.handle || `${did.slice(0, 20)}...`

  return (
    <span className="group inline-flex items-center gap-1 rounded bg-gray-100 dark:bg-slate-700 px-2 py-1 text-xs text-gray-700 dark:text-gray-200">
      <img
        className="h-4 w-4 rounded-full"
        src={profile?.avatar || '/img/default-avatar.jpg'}
        alt=""
      />
      {displayLabel}
      {onRemove && (
        <button
          onClick={onRemove}
          className="hidden group-hover:inline-flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-100"
        >
          <XMarkIcon className="h-3 w-3" />
        </button>
      )}
    </span>
  )
}
