import { isHighProfileAccount } from '@/workspace/utils'
import { AppBskyActorDefs } from '@atproto/api'
import { StarIcon } from '@heroicons/react/24/outline'

export type HighProfileStatusBadgeProps = {
  profile?: AppBskyActorDefs.ProfileViewDetailed
}

export function HighProfileStatusBadge({ profile }: HighProfileStatusBadgeProps) {
  if (isHighProfileAccount(profile?.followersCount)) {
    return (
      <StarIcon
        className="w-4 h-4 ml-1 text-orange-300"
        title={`High profile user with ${profile?.followersCount} followers`}
      />
    )
  }
  return null
}
