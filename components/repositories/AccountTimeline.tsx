import { useState } from 'react'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import {
  ToolsOzoneModerationDefs,
  ToolsOzoneModerationGetAccountTimeline,
} from '@atproto/api'
import { classNames, pluralize } from '@/lib/util'
import { MOD_EVENT_TITLES } from '@/mod-event/constants'
import { Card } from '@/common/Card'
import {
  ChevronDownIcon,
  ListBulletIcon,
  PencilSquareIcon,
  UserCircleIcon,
} from '@heroicons/react/24/solid'
import { ModEventItem } from '@/mod-event/EventItem'
import { LoadMoreButton } from '@/common/LoadMoreButton'
import { SubjectSummary } from '@/subject/Summary'
import { ActionButton } from '@/common/buttons'

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

export const AccountTimeline = ({
  did,
  stats,
  onToggleView,
}: {
  did: string
  stats?: {
    accountStats?: ToolsOzoneModerationDefs.AccountStats
    recordsStats?: ToolsOzoneModerationDefs.RecordsStats
  }
  onToggleView: () => void
}) => {
  const { data, isLoading, isError } = useAccountTimelineQuery(did)
  if (isLoading) return <div>Loading...</div>
  if (isError) return <div>Error loading timeline</div>
  if (!data) return <div>No timeline data available</div>

  return (
    <>
      {!!stats && (
        <div className="flex flex-row justify-between items-center mb-2">
          <SubjectSummary stats={stats} />
          <ActionButton
            onClick={onToggleView}
            size="xs"
            appearance="outlined"
            title="Show event log"
          >
            <ListBulletIcon className="h-4 w-4" />
          </ActionButton>
        </div>
      )}
      <VerticalTimeline timelineData={data} accountDid={did} />
    </>
  )
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

const TimelineDay = ({
  item,
  accountDid,
}: {
  item: ToolsOzoneModerationGetAccountTimeline.TimelineItem
  accountDid: string
}) => {
  const [showEvents, setShowEvents] = useState(false)

  if (showEvents) {
    return (
      <EventList
        item={item}
        accountDid={accountDid}
        showEvents={showEvents}
        onShowEvents={() => setShowEvents(false)}
      />
    )
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
            {recordSummaries.length > 1 ? 'across records' : 'on 1 record'}
          </div>
        )}
      </div>
    </Card>
  )
}

const TimelineDayHeader = ({ item, onShowEvents }) => {
  let accountEventCount = 0
  let recordEventCount = 0

  item.summary.forEach((summary) => {
    if (summary.eventSubjectType === 'account') {
      accountEventCount += summary.count
    } else if (summary.eventSubjectType === 'record') {
      recordEventCount += summary.count
    }
  })

  return (
    <div className="flex justify-between items-center">
      <h4 className="dark:text-gray-100 text-gray-700 mb-1">
        {formatDate(item.day)}
      </h4>
      <div className="text-gray-500 text-sm flex flex-row items-center">
        <button
          onClick={() => onShowEvents()}
          className="flex flex-row items-center"
        >
          {accountEventCount > 0 && (
            <>
              <UserCircleIcon className="h-4 w-4 mr-0.5" />
              <span className="mr-1">{accountEventCount}</span>
            </>
          )}
          {recordEventCount > 0 && (
            <>
              <PencilSquareIcon className="h-4 w-4 mr-0.5" />
              <span className="mr-1">{recordEventCount}</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

const useEventsForDay = (subject: string, day: string, enabled: boolean) => {
  const labelerAgent = useLabelerAgent()

  return useInfiniteQuery({
    queryKey: ['eventsForDay', { subject, day }],
    queryFn: async ({ pageParam }) => {
      const startDate = new Date(day)
      const endDate = new Date(day)
      endDate.setDate(endDate.getDate() + 1)

      const { data } = await labelerAgent.tools.ozone.moderation.queryEvents({
        subject,
        includeAllUserRecords: true,
        createdAfter: startDate.toISOString(),
        createdBefore: endDate.toISOString(),
        limit: 25,
        cursor: pageParam,
      })

      return {
        events: data.events,
        cursor: data.cursor,
      }
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
    enabled,
  })
}

const EventList = ({
  item,
  accountDid,
  onShowEvents,
  showEvents,
}: {
  item: ToolsOzoneModerationGetAccountTimeline.TimelineItem
  accountDid: string
  onShowEvents: () => void
  showEvents: boolean
}) => {
  const { data, isLoading, isError, fetchNextPage, hasNextPage } =
    useEventsForDay(accountDid, item.day, true)

  const allEvents = data?.pages.flatMap((page) => page.events) ?? []

  return (
    <div
      className={classNames(
        'mb-2',
        showEvents ? 'border-t border-b my-2 py-2 dark:border-gray-700' : '',
      )}
    >
      <TimelineDayHeader item={item} onShowEvents={onShowEvents} />
      <div className="-mt-2">
        {isLoading && (
          <div className="p-4 text-center text-gray-500">Loading events...</div>
        )}
        {isError && (
          <div className="p-4 text-center text-red-500">
            Error loading events
          </div>
        )}
        {allEvents.map((modEvent) => (
          <ModEventItem
            key={modEvent.id}
            modEvent={modEvent}
            showContentAuthor={false}
            showContentPreview={false}
            showContentDetails={true}
          />
        ))}
        {allEvents.length === 0 && !isLoading && (
          <div className="p-4 text-center text-gray-500">
            No events found for this day
          </div>
        )}
        {hasNextPage && (
          <div className="flex justify-center my-2">
            <LoadMoreButton onClick={() => fetchNextPage()} />
          </div>
        )}
      </div>
    </div>
  )
}

const getSummaryText = ({ summary }) => {
  const { eventType, count } = summary

  let eventTitle = MOD_EVENT_TITLES[eventType]

  if (eventType === 'tools.ozone.moderation.defs#timelineEventPlcOperation') {
    eventTitle = `PLC Op`
  }
  if (eventType === 'tools.ozone.moderation.defs#timelineEventPlcCreate') {
    eventTitle = `PLC Creation`
  }
  if (eventType === 'tools.ozone.moderation.defs#timelineEventPlcTombstone') {
    eventTitle = `PLC Tombstone`
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
