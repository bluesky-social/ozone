import { SubjectOverview } from '@/reports/SubjectOverview'
import { ComAtprotoAdminDefs, ComAtprotoModerationDefs } from '@atproto/api'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export const ItemTitle = ({
  modEvent,
  showContentDetails,
  showContentAuthor,
}: {
  modEvent: ComAtprotoAdminDefs.ModEventView
  showContentDetails: boolean
  showContentAuthor: boolean
}) => {
  const createdAt = dateFormatter.format(new Date(modEvent.createdAt))
  let eventTitle: JSX.Element | string = 'Event'
  let eventColor = ''
  if (ComAtprotoAdminDefs.isModEventEscalate(modEvent.event)) {
    eventColor = 'text-blue-400'
    eventTitle = 'Escalated'
  }
  if (ComAtprotoAdminDefs.isModEventAcknowledge(modEvent.event)) {
    eventColor = 'text-blue-400'
    eventTitle = 'Acknowledged'
  }
  if (ComAtprotoAdminDefs.isModEventReport(modEvent.event)) {
    const isAppeal =
      modEvent.event.reportType === ComAtprotoModerationDefs.REASONAPPEAL
    eventColor = isAppeal ? 'text-orange-500' : 'text-orange-300'
    eventTitle = isAppeal ? 'Appealed' : 'Reported'
  }
  if (ComAtprotoAdminDefs.isModEventResolveAppeal(modEvent.event)) {
    eventColor = 'text-blue-400'
    eventTitle = 'Resolved Appeal'
  }
  if (ComAtprotoAdminDefs.isModEventTakedown(modEvent.event)) {
    eventColor = modEvent.event.durationInHours
      ? 'text-red-200'
      : 'text-red-500'
    eventTitle = modEvent.event.durationInHours ? 'Suspended' : 'Taken down'
  }
  if (ComAtprotoAdminDefs.isModEventReverseTakedown(modEvent.event)) {
    eventColor = 'text-blue-400'
    eventTitle = 'Reverted takedown'
  }
  if (ComAtprotoAdminDefs.isModEventLabel(modEvent.event)) {
    eventColor = 'text-blue-400'
    eventTitle = 'Labeled'
  }
  if (ComAtprotoAdminDefs.isModEventMute(modEvent.event)) {
    eventColor = 'text-blue-400'
    eventTitle = 'Muted'
  }
  if (ComAtprotoAdminDefs.isModEventUnmute(modEvent.event)) {
    eventColor = 'text-blue-400'
    eventTitle = 'Unmuted'
  }
  if (ComAtprotoAdminDefs.isModEventComment(modEvent.event)) {
    eventColor = 'text-blue-400'
    eventTitle = modEvent.event.sticky ? 'Added note' : 'Commented'
  }
  if (ComAtprotoAdminDefs.isModEventEmail(modEvent.event)) {
    eventColor = 'text-blue-400'
    eventTitle = 'Email sent'
  }

  return (
    <div className="text-gray-500 flex flex-row justify-between">
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
