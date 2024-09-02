import { ToolsOzoneModerationDefs } from '@atproto/api'
import { getLastReviewedAt } from './helpers'

export const LastReviewedTimestamp = ({
  subjectStatus,
}: {
  subjectStatus: ToolsOzoneModerationDefs.SubjectStatusView
}) => {
  if (subjectStatus.lastReviewedAt) {
    return (
      <span className="pl-1">
        Last{' '}
        {subjectStatus.reviewState === ToolsOzoneModerationDefs.REVIEWNONE
          ? 'event'
          : 'reviewed'}{' '}
        at: {getLastReviewedAt(subjectStatus)}
      </span>
    )
  }

  return <span className="pl-1">Not yet reviewed</span>
}
