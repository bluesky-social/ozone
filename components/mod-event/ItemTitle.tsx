import { SubjectOverview } from '@/reports/SubjectOverview'
import { ToolsOzoneModerationDefs, ComAtprotoModerationDefs } from '@atproto/api'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export const ItemTitle = ({
  modEvent,
  showContentDetails,
  showContentAuthor,
}: {
  modEvent: ToolsOzoneModerationDefs.ModEventView
  showContentDetails: boolean
  showContentAuthor: boolean
}) => {
  const createdAt = dateFormatter.format(new Date(modEvent.createdAt))
  let eventTitle: JSX.Element | string = 'Event'
  let eventColor = ''
  if (ToolsOzoneModerationDefs.isModEventEscalate(modEvent.event)) {
    eventColor = 'text-blue-400'
    eventTitle = 'Escalated'
  }
  if (ToolsOzoneModerationDefs.isModEventAcknowledge(modEvent.event)) {
    eventColor = 'text-blue-400'
    eventTitle = 'Acknowledged'
  }
  if (ToolsOzoneModerationDefs.isModEventReport(modEvent.event)) {
    const isAppeal =
      modEvent.event.reportType === ComAtprotoModerationDefs.REASONAPPEAL
    eventColor = isAppeal ? 'text-orange-500' : 'text-orange-300'
    eventTitle = isAppeal ? 'Appealed' : 'Reported'
  }
  if (ToolsOzoneModerationDefs.isModEventResolveAppeal(modEvent.event)) {
    eventColor = 'text-blue-400'
    eventTitle = 'Resolved Appeal'
  }
  if (ToolsOzoneModerationDefs.isModEventTakedown(modEvent.event)) {
    eventColor = modEvent.event.durationInHours
      ? 'text-red-200'
      : 'text-red-500'
    eventTitle = modEvent.event.durationInHours ? 'Suspended' : 'Taken down'
  }
  if (ToolsOzoneModerationDefs.isModEventReverseTakedown(modEvent.event)) {
    eventColor = 'text-blue-400'
    eventTitle = 'Reverted takedown'
  }
  if (ToolsOzoneModerationDefs.isModEventLabel(modEvent.event)) {
    eventColor = 'text-blue-400'
    eventTitle = 'Labeled'
  }
  if (ToolsOzoneModerationDefs.isModEventTag(modEvent.event)) {
    eventColor = 'text-blue-400'
    eventTitle = 'Tagged'
  }
  if (ToolsOzoneModerationDefs.isModEventMute(modEvent.event)) {
    eventColor = 'text-blue-400'
    eventTitle = 'Muted'
  }
  if (ToolsOzoneModerationDefs.isModEventUnmute(modEvent.event)) {
    eventColor = 'text-blue-400'
    eventTitle = 'Unmuted'
  }
  if (ToolsOzoneModerationDefs.isModEventComment(modEvent.event)) {
    eventColor = 'text-blue-400'
    eventTitle = modEvent.event.sticky ? 'Added note' : 'Commented'
  }
  if (ToolsOzoneModerationDefs.isModEventEmail(modEvent.event)) {
    eventColor = 'text-blue-400'
    eventTitle = 'Email sent'
  }

  return (
    <div className="text-gray-500 dark:text-gray-50 flex flex-row justify-between">
      <p>
        <span className={eventColor}>{eventTitle}</span>
        <i>
          {' '}
          at{' '}
          <a
            target="_blank"
            className="underline"
            href={`/events/${modEvent.id}`}
          >
            {createdAt}
          </a>
        </i>
      </p>
      {showContentDetails && (
        <p>
          <SubjectOverview
            withTruncation
            subject={modEvent.subject}
            hideActor={!showContentAuthor}
            subjectRepoHandle={modEvent.subjectHandle}
          />
        </p>
      )}
    </div>
  )
}
