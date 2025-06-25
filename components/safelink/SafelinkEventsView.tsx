'use client'
import { ToolsOzoneSafelinkDefs } from '@atproto/api'
import { useSafelinkEvents } from './useSafelinkEvents'
import { getActionText, getPatternText, getReasonText, getEventTypeText, getActionColor } from './helpers'
import { Card } from '@/common/Card'
import { LoadMoreButton } from '@/common/LoadMoreButton'
import { formatDistanceToNow } from 'date-fns'

interface SafelinkEventsViewProps {
  searchQuery?: string
  url?: string
  pattern?: ToolsOzoneSafelinkDefs.PatternType
}

export function SafelinkEventsView({ searchQuery = '', url, pattern }: SafelinkEventsViewProps) {
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
  const filteredEvents = url && pattern 
    ? events.filter(event => event.url === url && event.pattern === pattern)
    : events

  if (filteredEvents.length === 0) {
    return (
      <Card>
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
              <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                {getPatternText(pattern)}
              </span>
              <span className="font-mono break-all">{url}</span>
            </div>
          </div>
        </Card>
      )}

      {filteredEvents.map((event) => (
        <Card key={event.id}>
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {getEventTypeText(event.eventType)}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                </span>
              </div>
              
              <div className="text-xs text-gray-500 dark:text-gray-400">
                #{event.id}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  {getPatternText(event.pattern)}
                </span>
                <span className="font-mono break-all">{event.url}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className={`font-medium ${getActionColor(event.action)}`}>
                  {getActionText(event.action)}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  {getReasonText(event.reason)}
                </span>
              </div>

              {event.comment && (
                <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
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
        <LoadMoreButton
          onClick={fetchNextPage}
          disabled={isFetchingNextPage}
          className="w-full"
        />
      )}
    </div>
  )
}