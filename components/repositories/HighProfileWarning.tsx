import { Alert } from '@/common/Alert'
import {
  HIGH_PROFILE_FOLLOWER_THRESHOLD,
  SOCIAL_APP_URL,
} from '@/lib/constants'
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
  const { followersCount, verification, associated, did } = profile
  const lowFollowerCount =
    !followersCount || followersCount < HIGH_PROFILE_FOLLOWER_THRESHOLD
  const trustedVerifier = verification?.trustedVerifierStatus === 'valid'
  const isVerified = verification?.verifiedStatus === 'valid'
  const isLabeler = !!associated?.labeler

  if (lowFollowerCount && !trustedVerifier && !isVerified && !isLabeler) {
    return null
  }

  const fragments: React.ReactNode[] = []

  if (!lowFollowerCount) {
    fragments.push(
      <>
        has more than {numberFormatter.format(HIGH_PROFILE_FOLLOWER_THRESHOLD)}{' '}
        followers (<b>{numberFormatter.format(followersCount)} total</b>)
      </>,
    )
  }

  if (isLabeler) {
    fragments.push(
      <>
        has a{' '}
        <b>
          <a
            className="underline"
            href={`${SOCIAL_APP_URL}/profile/${did}`}
            target="_blank"
          >
            labeler profile
          </a>
        </b>
      </>,
    )
  }

  if (trustedVerifier) {
    fragments.push(
      <>
        is a <b>trusted verifier</b>
      </>,
    )
  }

  if (isVerified) {
    fragments.push(
      <>
        has been <b>verified</b>
      </>,
    )
  }

  return (
    <Alert
      type="warning"
      title="High profile account"
      body={
        <div>
          Please take caution when moderating this account.{' '}
          {fragments.length > 1 ? (
            <>
              This user: <br />
              <ul className="list-disc pl-4">
                {fragments.map((fragment, index) => (
                  <li key={index}>{fragment}</li>
                ))}
              </ul>
            </>
          ) : (
            <>This user {fragments[0]}.</>
          )}
        </div>
      }
    />
  )
}
