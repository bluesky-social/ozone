import {
  isValidProfileViewDetailed,
  isValidRepoViewDetailed,
} from '@/repositories/helpers'
import { ToolsOzoneVerificationDefs } from '@atproto/api'
import { getVerificationIssuerHandle } from './utils'
import { Card } from '@/common/Card'
import { SubjectOverview } from '@/reports/SubjectOverview'
import { RepoCardView } from '@/common/RecordCard'
import VerificationErrorBoundary from './VerificationError'

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
    revokedAt,
    revokedBy,
  } = verification
  const isRepoView = isValidRepoViewDetailed(subjectRepo)
  const isProfileView = isValidProfileViewDetailed(subjectProfile)
  const revokedByNonIssuer = revokedBy && revokedBy !== issuer

  if (handle.includes('ar')) {
    throw new Error('Invalid handle')
  }

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
          {!!revokedAt && (
            <div className="text-red-500 dark:text-red-300">
              Revoked at {dateFormatter.format(new Date(revokedAt))}{' '}
              {revokedByNonIssuer && ` by ${revokedBy}`}
            </div>
          )}
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
            <VerificationErrorBoundary uri={verification.uri}>
              <VerificationCard verification={verification} />
            </VerificationErrorBoundary>
          </div>
        )
      })}
    </div>
  )
}
