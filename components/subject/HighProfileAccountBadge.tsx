import { StarIcon } from '@heroicons/react/24/outline'

export type HighProfileAccountBadgeProps = {
  followersCount?: number
}

export function HighProfileAccountBadge({
  followersCount,
}: HighProfileAccountBadgeProps) {
  return (
    <StarIcon
      className="w-4 h-4 ml-1 text-orange-300"
      title={`High profile user with ${followersCount} followers`}
    />
  )
}
