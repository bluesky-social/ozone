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
import { LabelChip } from '@/common/labels/List'
import { useSearchParams } from 'next/navigation'

export function SafelinkEventList() {
  const searchParams = useSearchParams()
  const urls = searchParams.get('urls')?.split(',').filter(Boolean) || []
  const pattern = searchParams.get('pattern') as
    | ToolsOzoneSafelinkDefs.PatternType
    | undefined

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSafelinkEvents({ urls, pattern })

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

  if (events.length === 0) {
    return (
      <Card className="mt-4">
        <div className="p-4 text-center text-gray-600 dark:text-gray-400">
          {urls?.length || pattern
            ? 'No safelink events found matching your criteria.'
            : 'No safelink events found.'}
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {(urls?.length || pattern) && (
        <div className="border-b border-gray-200 dark:border-gray-700 pb-1">
          <div className="flex items-center gap-2 text-sm">
            {!!pattern && (
              <LabelChip className="dark:bg-slate-600 dark:text-gray-200 -ml-0.5">
                {getPatternText(pattern)}
              </LabelChip>
            )}
            <span className=" break-all">{urls?.join(', ')}</span>
          </div>
        </div>
      )}

      {events.map((event) => (
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
