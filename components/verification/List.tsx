import { ProfileCard } from '@/repositories/AccountView'
import {
  isValidProfileViewDetailed,
  isValidRepoViewDetailed,
} from '@/repositories/helpers'
import { ToolsOzoneVerificationDefs } from '@atproto/api'
import { CheckBadgeIcon } from '@heroicons/react/24/solid'
import { getVerificationIssuerHandle } from './utils'
import { Card } from '@/common/Card'
import { SubjectOverview } from '@/reports/SubjectOverview'
import { RepoCardView } from '@/common/RecordCard'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const VerificationCard = ({
  verification,
}: {
  verification: ToolsOzoneVerificationDefs.VerificationView
}) => {
  const {
    subject,
    handle,
    displayName,
    subjectRepo,
    subjectProfile,
    issuer,
    createdAt,
  } = verification
  const isRepoView = isValidRepoViewDetailed(subjectRepo)
  const isProfileView = isValidProfileViewDetailed(subjectProfile)

  return (
    <Card className="mb-3 text-sm px-3">
      <div className="flex flex-row gap-2">
        <div>
          <div className="flex flex-row items-center">
            <span className="mr-1">{displayName}</span>
            <SubjectOverview
              subject={{ did: subject }}
              subjectRepoHandle={handle}
              withTruncation={true}
            />
          </div>
          <div className="flex flex-row items-center">
            Verified{' '}
            {createdAt && `At ${dateFormatter.format(new Date(createdAt))} `}
            <span className="mx-1">By</span>
            <SubjectOverview
              subject={{ did: issuer }}
              subjectRepoHandle={getVerificationIssuerHandle(verification)}
              withTruncation={true}
            />
          </div>
        </div>
      </div>
      <div className="border-t mt-2 pt-2 border-gray-200 dark:border-gray-700">
        <RepoCardView
          did={subject}
          repo={isRepoView ? subjectRepo : undefined}
          profile={isProfileView ? subjectProfile : undefined}
        />
      </div>
    </Card>
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
        return (
          <div key={verification.uri}>
            <VerificationCard verification={verification} />
          </div>
        )
      })}
    </div>
  )
}
