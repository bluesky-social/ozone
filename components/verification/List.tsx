import { ProfileCard } from '@/repositories/AccountView'
import { isValidProfileViewDetailed } from '@/repositories/helpers'
import { ToolsOzoneVerificationDefs } from '@atproto/api'
import { CheckBadgeIcon } from '@heroicons/react/24/solid'

const VerificationCard = ({
  verification,
}: {
  verification: ToolsOzoneVerificationDefs.VerificationView
}) => {
  return (
    <div>
      <div className="flex flex-row gap-2">
        <div>
          <CheckBadgeIcon className="w-6 h-6" />
        </div>
        <div>
          <p>{verification.displayName}</p>
          <p>{verification.handle}</p>
        </div>
      </div>
    </div>
  )
}

export const VerificationList = ({
  verifications,
}: {
  verifications: ToolsOzoneVerificationDefs.VerificationView[]
}) => {
  return (
    <div className="mt-2">
      {verifications.map((verification) => {
        const { subjectProfile, uri } = verification
        return (
          <div key={uri}>
            {isValidProfileViewDetailed(subjectProfile) ? (
              <ProfileCard profile={subjectProfile} />
            ) : (
              <div>Profile not found</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
