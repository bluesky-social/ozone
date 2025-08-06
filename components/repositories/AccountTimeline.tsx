import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { ToolsOzoneModerationGetAccountTimeline, ToolsOzoneModerationDefs } from '@atproto/api'
import { pluralize } from '@/lib/util'
import { MOD_EVENT_TITLES } from '@/mod-event/constants'
import { Card } from '@/common/Card'
import { ChevronDownIcon } from '@heroicons/react/24/solid'
import { ModEventItem } from '@/mod-event/EventItem'

const useAccountTimelineQuery = (did: string) => {
  const labelerAgent = useLabelerAgent()
  return useQuery({
    queryKey: ['accountTimeline', { did }],
    queryFn: async () => {
      const {
        data: { timeline },
      } = await labelerAgent.tools.ozone.moderation.getAccountTimeline({
        did,
      })

      return timeline
    },
  })
}

export const AccountTimeline = ({ did }: { did: string }) => {
  const { data, isLoading, isError } = useAccountTimelineQuery(did)
  if (isLoading) return <div>Loading...</div>
  if (isError) return <div>Error loading timeline</div>
  if (!data) return <div>No timeline data available</div>

  return <VerticalTimeline timelineData={data} accountDid={did} />
}

// Format date to a more readable format
const formatDate = (dateString) => {
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
  return new Date(dateString).toLocaleDateString(undefined, options)
}

const VerticalTimeline = ({
  timelineData = [],
  accountDid,
}: {
  timelineData: ToolsOzoneModerationGetAccountTimeline.TimelineItem[]
  accountDid: string
}) => {
  return (
    <div className="">
      <ul>
        {timelineData.map((item, index) => {
          return (
            <li key={item.day}>
              <TimelineDay item={item} accountDid={accountDid} />
            </li>
          )
        })}
      </ul>

      {timelineData.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No timeline data available
        </div>
      )}
    </div>
  )
}

const TimelineDay = ({ item, accountDid }: { item: ToolsOzoneModerationGetAccountTimeline.TimelineItem; accountDid: string }) => {
  const [showEvents, setShowEvents] = useState(false)

  if (showEvents) {
    return <EventList item={item} accountDid={accountDid} onShowEvents={() => setShowEvents(false)} />
  }

  return (
    <TimelineSummary item={item} onShowEvents={() => setShowEvents(true)} />
  )
}

const TimelineSummary = ({ item, onShowEvents }) => {
  const accountSummaries: ToolsOzoneModerationGetAccountTimeline.TimelineItemSummary[] =
    []
  const recordSummaries: ToolsOzoneModerationGetAccountTimeline.TimelineItemSummary[] =
    []
  item.summary.forEach((summary) => {
    if (summary.eventSubjectType === 'account') {
      accountSummaries.push(summary)
    } else if (summary.eventSubjectType === 'record') {
      recordSummaries.push(summary)
    }
  })
  return (
    <Card className="mb-2">
      <TimelineDayHeader item={item} onShowEvents={onShowEvents} />
      <div className="dark:text-gray-300">
        {!!accountSummaries.length && (
          <div>
            {accountSummaries
              .map((summary) => getSummaryText({ summary }))
              .join(', ')}{' '}
            on account
          </div>
        )}
        {!!recordSummaries.length && (
          <div>
            {recordSummaries
              .map((summary) => getSummaryText({ summary }))
              .join(', ')}{' '}
            on records
          </div>
        )}
      </div>
    </Card>
  )
}

const TimelineDayHeader = ({ item, onShowEvents }) => {
  return (
    <div className="flex justify-between items-center">
      <h4 className="dark:text-gray-100 text-gray-700 mb-1">
        {formatDate(item.day)}
      </h4>
      <div className="text-gray-500 text-sm">
        <button onClick={() => onShowEvents()}>
          {pluralize(
            item.summary?.reduce((acc, event) => acc + event.count, 0),
            'event',
          )}
          <ChevronDownIcon className="inline-block h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

const useEventsForDay = (accountDid: string, day: string, enabled: boolean) => {
  const labelerAgent = useLabelerAgent()
  
  return useQuery({
    queryKey: ['eventsForDay', { accountDid, day }],
    queryFn: async () => {
      const startDate = new Date(day)
      const endDate = new Date(day)
      endDate.setDate(endDate.getDate() + 1)
      
      const { data } = await labelerAgent.tools.ozone.moderation.queryEvents({
        subject: accountDid,
        createdAfter: startDate.toISOString(),
        createdBefore: endDate.toISOString(),
        limit: 100,
      })
      
      return data.events
    },
    enabled,
  })
}

const EventList = ({ item, accountDid, onShowEvents }: { 
  item: ToolsOzoneModerationGetAccountTimeline.TimelineItem
  accountDid: string
  onShowEvents: () => void 
}) => {
  const { data: events, isLoading, isError } = useEventsForDay(accountDid, item.day, true)
  
  return (
    <div className="mb-2">
      <TimelineDayHeader item={item} onShowEvents={onShowEvents} />
      <div className="-mt-2">
        {isLoading && <div className="p-4 text-center text-gray-500">Loading events...</div>}
        {isError && <div className="p-4 text-center text-red-500">Error loading events</div>}
        {events?.map((modEvent) => (
          <ModEventItem
            key={modEvent.id}
            modEvent={modEvent as ToolsOzoneModerationDefs.ModEventView}
            showContentAuthor={false}
            showContentPreview={false}
            showContentDetails={false}
          />
        ))}
        {events && events.length === 0 && (
          <div className="p-4 text-center text-gray-500">No events found for this day</div>
        )}
      </div>
    </div>
  )
}

const getSummaryText = ({ summary }) => {
  const { eventType, count } = summary

  let eventTitle = MOD_EVENT_TITLES[eventType]

  if (eventType === 'plc_operation') {
    eventTitle = `PLC Operation`
  }
  if (eventType === 'tools.ozone.hosting.getAccountHistory#emailConfirmed') {
    eventTitle = 'Email Confirmation'
  }
  if (eventType === 'tools.ozone.hosting.getAccountHistory#accountCreated') {
    eventTitle = 'Account Creation'
  }
  if (eventType === 'tools.ozone.hosting.getAccountHistory#emailUpdated') {
    eventTitle = 'Email Update'
  }
  if (eventType === 'tools.ozone.hosting.getAccountHistory#passwordUpdated') {
    eventTitle = 'Password Update'
  }
  if (eventType === 'tools.ozone.hosting.getAccountHistory#handleUpdated') {
    eventTitle = 'Handle Update'
  }

  if (!eventTitle) {
    eventTitle = eventType
  }

  return pluralize(count, `${eventTitle}`)
}
