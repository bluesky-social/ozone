'use client'
import { ToolsOzoneSafelinkDefs } from '@atproto/api'
import { useSafelinkEvents } from './useSafelinkEvents'
import { getPatternText } from './helpers'
import { Card } from '@/common/Card'
import { LoadMoreButton } from '@/common/LoadMoreButton'
import { formatDistanceToNow } from 'date-fns'
import {
  SafelinkAction,
  SafelinkEventType,
  SafelinkPattern,
  SafelinkReason,
  SafelinkUrl,
} from './Shared'

export function SafelinkEventList({
  searchQuery = '',
  url,
  pattern,
}: {
  searchQuery?: string
  url?: string
  pattern?: ToolsOzoneSafelinkDefs.PatternType
}) {
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSafelinkEvents(searchQuery)

  if (isLoading) {
    return (
      <Card>
        <div className="p-4 text-center text-gray-600 dark:text-gray-400">
          Loading safelink events...
        </div>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card>
        <div className="p-4 text-center text-red-600 dark:text-red-400">
          Error loading safelink events
        </div>
      </Card>
    )
  }

  const events = data?.pages.flatMap((page) => page.events) || []

  // Filter events if specific URL/pattern is provided
  const filteredEvents =
    url && pattern
      ? events.filter((event) => event.url === url && event.pattern === pattern)
      : events

  if (filteredEvents.length === 0) {
    return (
      <Card className="mt-4">
        <div className="p-4 text-center text-gray-600 dark:text-gray-400">
          {searchQuery || (url && pattern)
            ? 'No safelink events found matching your criteria.'
            : 'No safelink events found.'}
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {url && pattern && (
        <Card>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-2">Event History</h3>
            <div className="flex items-center gap-2 text-sm">
              <span className=" bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                {getPatternText(pattern)}
              </span>
              <span className=" break-all">{url}</span>
            </div>
          </div>
        </Card>
      )}

      {filteredEvents.map((event) => (
        <Card key={event.id}>
          <div className="px-2">
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2 text-sm">
                <SafelinkPattern rule={event} />
                <SafelinkEventType event={event} />
                <SafelinkAction rule={event} />
                <SafelinkReason rule={event} />
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400">
                <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                  {formatDistanceToNow(new Date(event.createdAt), {
                    addSuffix: true,
                  })}
                </span>
                #{event.id}
              </div>
            </div>

            <div>
              <SafelinkUrl rule={event} />
              {event.comment && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {event.comment}
                </div>
              )}

              <div className="text-xs text-gray-500 dark:text-gray-500 flex justify-between">
                <span>Created by: {event.createdBy}</span>
                <span>{new Date(event.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </Card>
      ))}

      {hasNextPage && (
        <div className="flex justify-center mb-4">
          <LoadMoreButton
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          />
        </div>
      )}
    </div>
  )
}
