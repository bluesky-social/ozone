'use client'
import { ToolsOzoneModerationDefs } from '@atproto/api'
import { LoadMoreButton } from '@/common/LoadMoreButton'
import { Card } from '@/common/Card'
import { formatDistanceToNow } from 'date-fns'
import { SubjectOverview } from '@/reports/SubjectOverview'
import { ReviewStateIcon } from '@/subject/ReviewStateMarker'
import { Checkbox } from '@/common/forms'
import { ModToolInfo } from '@/mod-event/ModToolInfo'
import { TakedownPolicy } from '@/mod-event/EventItem'
import { usePermission } from '@/shell/ConfigurationContext'
import { TextWithLinks } from '@/common/TextWithLinks'

interface ScheduledActionsTableProps {
  actions: ToolsOzoneModerationDefs.ScheduledActionView[]
  repos: Record<string, ToolsOzoneModerationDefs.RepoViewDetail>
  onLoadMore: () => void
  showLoadMore: boolean
  onSelect: (
    action: ToolsOzoneModerationDefs.ScheduledActionView,
    selected: boolean,
  ) => void
}

const dateFormatter = new Intl.DateTimeFormat('default', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const formatDateTime = (dateString: string) => {
  return dateFormatter.format(new Date(dateString))
}

const getStatusBadgeClass = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    case 'executed':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'cancelled':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    case 'failed':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }
}

const getEventData = (action: ToolsOzoneModerationDefs.ScheduledActionView) => {
  if (
    action.eventData?.$type === 'tools.ozone.moderation.scheduleAction#takedown'
  ) {
    return {
      event: action.eventData as ToolsOzoneModerationDefs.ModEventTakedown,
      modTool: action.eventData.modTool as ToolsOzoneModerationDefs.ModTool,
    }
  }

  return null
}

export function ScheduledActionsTable({
  actions,
  repos,
  onLoadMore,
  showLoadMore,
  onSelect,
}: ScheduledActionsTableProps) {
  const canTakedown = usePermission('canTakedown')
  return (
    <>
      {actions.map((action, index) => {
        const repo = repos[action.did]
        let executionDate: Date = action.executeAt
          ? new Date(action.executeAt)
          : action.executeAfter
          ? new Date(action.executeAfter)
          : new Date()

        let execution = ''

        if (action.executeAt) {
          execution = formatDateTime(action.executeAt)
        } else if (action.executeAfter) {
          execution = formatDateTime(action.executeAfter)
          if (action.executeUntil) {
            execution += ` - ${formatDateTime(action.executeUntil)}`
          }
        }

        const timeToExecution = formatDistanceToNow(executionDate, {
          addSuffix: true,
        })
        const canCancel = action.status === 'pending' && canTakedown
        const isLastItem = index === actions.length - 1
        const eventData = getEventData(action)

        return (
          <Card key={action.id} className={`py-3 ${!isLastItem ? 'mb-3' : ''}`}>
            <div className="px-2">
              <div className="flex flex-row justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {canCancel && (
                      <Checkbox
                        onChange={(e) => {
                          onSelect(action, e.target.checked)
                        }}
                        className=""
                        label=""
                      />
                    )}
                    <span className="font-mono text-sm">#{action.id}</span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${getStatusBadgeClass(
                        action.status,
                      )}`}
                    >
                      {action.status.charAt(0).toUpperCase() +
                        action.status.slice(1)}
                    </span>

                    <div className="text-sm">
                      {repo && (
                        <div className="flex flex-row items-center">
                          {repo.moderation.subjectStatus && (
                            <ReviewStateIcon
                              subjectStatus={repo.moderation.subjectStatus}
                              className="h-4 w-4 mr-1"
                            />
                          )}
                          <SubjectOverview
                            subject={{ did: repo.did }}
                            subjectRepoHandle={repo.handle}
                            withTruncation={false}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {eventData?.event && (
                <div className="dark:text-gray-300 mb-1">
                  <TakedownPolicy policies={eventData.event.policies} />
                  {eventData.event.comment && (
                    <TextWithLinks text={eventData.event.comment} />
                  )}
                </div>
              )}

              <div className="text-sm text-gray-600 dark:text-gray-400">
                <div className="flex flex-row justify-between">
                  <span>
                    Execution: {execution} ({timeToExecution})
                  </span>
                </div>

                <div>
                  Created: {formatDateTime(action.createdAt)} by{' '}
                  <a
                    target="_blank"
                    href={`/repositories?quickOpen=${action.createdBy}`}
                    className="underline"
                  >
                    {action.createdBy}
                  </a>
                </div>

                {action.status !== 'pending' && (
                  <p>Last Update: {formatDateTime(action.createdAt)}</p>
                )}

                {action.lastFailureReason && (
                  <div className="text-xs text-red-600 dark:text-red-400">
                    Failed: {action.lastFailureReason}
                  </div>
                )}
              </div>
            </div>
            {!!eventData?.modTool && (
              <ModToolInfo modTool={eventData.modTool} />
            )}
          </Card>
        )
      })}

      {showLoadMore && (
        <div className="flex justify-center mt-4">
          <LoadMoreButton onClick={onLoadMore} />
        </div>
      )}
    </>
  )
}
