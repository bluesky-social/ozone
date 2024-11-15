import { Alert } from '@/common/Alert'
import { HIGH_PROFILE_FOLLOWER_THRESHOLD } from '@/lib/constants'
import { AppBskyActorDefs } from '@atproto/api'

export const HighProfileWarning = ({
  profile,
}: {
  profile: AppBskyActorDefs.ProfileViewDetailed
}) => {
  const { followersCount } = profile

  if (!followersCount || followersCount < HIGH_PROFILE_FOLLOWER_THRESHOLD) {
    return null
  }

  return (
    <Alert
      type="warning"
      title="High profile account"
      body={`This user has more than ${HIGH_PROFILE_FOLLOWER_THRESHOLD} followers. Please take caution when moderating this account.`}
    />
  )
}
