import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { ToolsOzoneModerationGetAccountTimeline } from '@atproto/api'
import { pluralize } from '@/lib/util'

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

  return <VerticalTimeline timelineData={data} />
}

const VerticalTimeline = ({
  timelineData = [],
}: {
  timelineData: ToolsOzoneModerationGetAccountTimeline.AccountTimeline[]
}) => {
  const [expandedDays, setExpandedDays] = useState({})

  const toggleDayExpansion = (day) => {
    setExpandedDays((prev) => ({
      ...prev,
      [day]: !prev[day],
    }))
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

  return (
    <div className="">
      <ul>
        {timelineData.map((item, index) => (
          <li key={index}>
            <div
              className="flex justify-between items-center cursor-pointer"
              onClick={() => toggleDayExpansion(item.day)}
            >
              <h3 className="dark:text-gray-300 text-gray-700">
                {formatDate(item.day)}
              </h3>
              <div className="text-gray-500 text-sm">
                {pluralize(
                  item.summary?.reduce((acc, event) => acc + event.count, 0),
                  'event',
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {timelineData.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No timeline data available
        </div>
      )}
    </div>
  )
}
