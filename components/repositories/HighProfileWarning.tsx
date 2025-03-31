import { Alert } from '@/common/Alert'
import { HIGH_PROFILE_FOLLOWER_THRESHOLD } from '@/lib/constants'
import { AppBskyActorDefs } from '@atproto/api'

export const numberFormatter = new Intl.NumberFormat('en', {
  notation: 'compact',
  compactDisplay: 'short',
})

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
      body={`This user has more than ${numberFormatter.format(
        HIGH_PROFILE_FOLLOWER_THRESHOLD,
      )} followers (${numberFormatter.format(
        followersCount,
      )} total). Please take caution when moderating this account.`}
    />
  )
}
