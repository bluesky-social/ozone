import { LabelChip } from '@/common/labels/List'
import {
  NEW_ACCOUNT_MARKER_THRESHOLD_IN_DAYS,
  YOUNG_ACCOUNT_MARKER_THRESHOLD_IN_DAYS,
} from '@/lib/constants'
import { getProfileFromRepo } from '@/repositories/helpers'
import { AppBskyActorDefs, ToolsOzoneModerationDefs } from '@atproto/api'
import {
  LockClosedIcon,
  MoonIcon,
  ShieldExclamationIcon,
  SunIcon,
} from '@heroicons/react/24/solid'
import { differenceInDays, formatDistance } from 'date-fns'

const getProfileCreatedAtFromRepo = (
  repo: ToolsOzoneModerationDefs.RepoView,
) => {
  const profile = getProfileFromRepo(repo.relatedRecords)
  return profile?.createdAt || repo.indexedAt
}

export const RecordAuthorStatus = ({
  repo,
  profile,
}: {
  repo: ToolsOzoneModerationDefs.RepoView
  profile?: AppBskyActorDefs.ProfileViewDetailed
}) => {
  // If a profile entry doesn't exist, use the repo.indexedAt timestamps as indicative of account creation date
  const createdAt = profile?.createdAt || getProfileCreatedAtFromRepo(repo)
  const accountAge = differenceInDays(new Date(), new Date(createdAt))
  const isNew = accountAge < NEW_ACCOUNT_MARKER_THRESHOLD_IN_DAYS
  const isYoung = accountAge < YOUNG_ACCOUNT_MARKER_THRESHOLD_IN_DAYS
  const deactivatedAt = repo.deactivatedAt
    ? formatDistance(new Date(repo.deactivatedAt), new Date(), {
        addSuffix: true,
      })
    : ''
  const isTakendown = !!repo.moderation.subjectStatus?.takendown

  return (
    <>
      {(isNew || isYoung) && (
        <LabelChip
          className="dark:bg-slate-700 dark:text-gray-200 rounded-xs"
          title={`Account was created less than ${
            isNew
              ? NEW_ACCOUNT_MARKER_THRESHOLD_IN_DAYS
              : YOUNG_ACCOUNT_MARKER_THRESHOLD_IN_DAYS
          } days ago`}
        >
          {isNew ? (
            <SunIcon className="w-4 h-4 mr-1 dark:text-yellow-300 text-yellow-500" />
          ) : (
            <MoonIcon className="w-4 h-4 mr-1 text-green-700" />
          )}
          {isNew ? 'New' : 'Young'} account
        </LabelChip>
      )}
      {!!deactivatedAt && (
        <LabelChip
          title={`Account was deactivated ${deactivatedAt}`}
          className="dark:bg-slate-700 dark:text-gray-200 rounded-xs"
        >
          <LockClosedIcon className="w-4 h-4 mr-1 text-orange-700" />
          Deactivated account
        </LabelChip>
      )}
      {isTakendown && (
        <LabelChip
          title={`Account was taken down`}
          className="dark:bg-slate-700 dark:text-gray-200 rounded-xs"
        >
          <ShieldExclamationIcon className="h-4 w-4 mr-1 text-red-700" />
          Takendown account
        </LabelChip>
      )}
    </>
  )
}
