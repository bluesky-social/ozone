import { LabelChip } from '@/common/labels'
import { NEW_ACCOUNT_MARKER_THRESHOLD_IN_DAYS } from '@/lib/constants'
import { ToolsOzoneModerationDefs } from '@atproto/api'
import {
  LockClosedIcon,
  ShieldExclamationIcon,
  SunIcon,
} from '@heroicons/react/24/solid'
import { differenceInDays, formatDistance } from 'date-fns'

export const RecordAuthorStatus = ({
  repo,
}: {
  repo: ToolsOzoneModerationDefs.RepoView
}) => {
  const isNew =
    differenceInDays(new Date(repo.indexedAt), new Date()) <
    NEW_ACCOUNT_MARKER_THRESHOLD_IN_DAYS
  const deactivatedAt = !!repo.deactivatedAt
    ? formatDistance(new Date(repo.deactivatedAt), new Date(), {
        addSuffix: true,
      })
    : ''

  const isTakendown = !!repo.moderation.subjectStatus?.takendown
  return (
    <>
      {isNew && (
        <LabelChip
          className="dark:bg-slate-700 dark:text-gray-200 rounded-xs"
          title={`Account was created less than ${NEW_ACCOUNT_MARKER_THRESHOLD_IN_DAYS} days ago`}
        >
          <SunIcon className="w-4 h-4 mr-1 text-green-700" />
          New account
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
