import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { ToolsOzoneModerationGetAccountTimeline } from '@atproto/api'
import { pluralize } from '@/lib/util'
import { MOD_EVENT_TITLES } from '@/mod-event/constants'
import { Card } from '@/common/Card'
import { ChevronDownIcon } from '@heroicons/react/24/solid'
import { ModEventItem } from '@/mod-event/EventItem'

const timeline = [
  {
    day: '2025-06-02',
    summary: [
      {
        eventSubjectType: 'record',
        eventType: 'tools.ozone.moderation.defs#modEventReport',
        count: 5,
      },
      {
        eventSubjectType: 'record',
        eventType: 'tools.ozone.moderation.defs#modEventTag',
        count: 2,
      },
      {
        eventSubjectType: 'account',
        eventType: 'plc_operation',
        count: 1,
      },
    ],
  },
  {
    day: '2025-06-01',
    summary: [
      {
        eventSubjectType: 'account',
        eventType: 'tools.ozone.moderation.defs#modEventReport',
        count: 1,
      },
      {
        eventSubjectType: 'account',
        eventType: 'tools.ozone.moderation.defs#modEventTag',
        count: 1,
      },
    ],
  },
  {
    day: '2025-05-28',
    summary: [
      {
        eventSubjectType: 'account',
        eventType: 'tools.ozone.hosting.getAccountHistory#emailUpdated',
        count: 3,
      },
      {
        eventSubjectType: 'account',
        eventType: 'tools.ozone.hosting.getAccountHistory#emailConfirmed',
        count: 1,
      },
    ],
  },
]

const eventList = {
  '2025-06-01': [
    {
      id: 58606942,
      event: {
        $type: 'tools.ozone.moderation.defs#modEventReport',
        isReporterMuted: false,
        reportType: 'com.atproto.moderation.defs#reasonSpam',
        comment: 'This is spam',
      },
      subject: {
        $type: 'com.atproto.admin.defs#repoRef',
        did: 'did:plc:qq2jij6z46yjzlocxhp7qo6g',
      },
      subjectBlobCids: [],
      createdBy: 'did:plc:mhy5m3wby5nq7flr2nj7m6ef',
      createdAt: '2025-05-28T19:16:11.714Z',
      subjectHandle: 'alice.test',
      creatorHandle: 'mod.bsky.social',
    },
    {
      id: 58606941,
      event: {
        $type: 'tools.ozone.moderation.defs#modEventTag',
        add: ['chat-disable'],
        remove: [],
      },
      subject: {
        $type: 'com.atproto.admin.defs#repoRef',
        did: 'did:plc:qq2jij6z46yjzlocxhp7qo6g',
      },
      subjectBlobCids: [],
      createdBy: 'did:plc:mhy5m3wby5nq7flr2nj7m6ef',
      createdAt: '2025-05-28T19:16:11.714Z',
      subjectHandle: 'alice.test',
      creatorHandle: 'mod.bsky.social',
    },
  ],
}

const useAccountTimelineQuery = (did: string) => {
  const labelerAgent = useLabelerAgent()
  return useQuery({
    queryKey: ['accountTimeline', { did }],
    queryFn: async () => {
      // const {
      //   data: { timeline },
      // } = await labelerAgent.tools.ozone.moderation.getAccountTimeline({
      //   did,
      // })

      return timeline
    },
  })
}

export const AccountTimeline = ({ did }: { did: string }) => {
  const { data, isLoading, isError } = useAccountTimelineQuery(did)
  if (isLoading) return <div>Loading...</div>
  if (isError) return <div>Error loading timeline</div>
  if (!data) return <div>No timeline data available</div>

  return <VerticalTimeline timelineData={data} />
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
}: {
  timelineData: ToolsOzoneModerationGetAccountTimeline.AccountTimeline[]
}) => {
  return (
    <div className="">
      <ul>
        {timelineData.map((item, index) => {
          return (
            <li key={item.day}>
              <TimelineDay item={item} />
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

const TimelineDay = ({ item }) => {
  const [showEvents, setShowEvents] = useState(false)

  if (showEvents) {
    return <EventList item={item} onShowEvents={() => setShowEvents(false)} />
  }

  return (
    <TimelineSummary item={item} onShowEvents={() => setShowEvents(true)} />
  )
}

const TimelineSummary = ({ item, onShowEvents }) => {
  const accountSummaries: ToolsOzoneModerationGetAccountTimeline.AccountTimelineSummary[] =
    []
  const recordSummaries: ToolsOzoneModerationGetAccountTimeline.AccountTimelineSummary[] =
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

const EventList = ({ item, onShowEvents }) => {
  return (
    <div className="mb-2">
      <TimelineDayHeader item={item} onShowEvents={onShowEvents} />
      <div className="-mt-2">
        {eventList[item.day]?.map((modEvent) => (
          <ModEventItem
            key={modEvent.id}
            modEvent={modEvent}
            showContentAuthor={false}
            showContentPreview={false}
            showContentDetails={false}
          />
        ))}
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
