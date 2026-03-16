'use client'
import { useState } from 'react'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowRightIcon,
  ChatBubbleLeftEllipsisIcon,
} from '@heroicons/react/24/outline'
import { formatDistanceToNow } from 'date-fns'
import { ToolsOzoneReportDefs } from '@atproto/api'
import { useListActivities } from './hooks'

const STATE_COLORS: Record<string, string> = {
  open: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  closed: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  escalated: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  assigned: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  queued: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
}

function StateBadge({ state }: { state: string }) {
  const color =
    STATE_COLORS[state] ??
    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium capitalize ${color}`}
    >
      {state}
    </span>
  )
}

function ActivityItem({
  activity,
}: {
  activity: ToolsOzoneReportDefs.ReportActivityView
}) {
  const isStatusChange = activity.action === 'status_change'
  const createdAt = new Date(activity.createdAt)

  return (
    <div className="relative pl-6 pb-4 last:pb-0">
      {/* Timeline dot */}
      <span
        className={`absolute left-0 top-1 h-3 w-3 rounded-full border-2 bg-white dark:bg-slate-800 ${
          isStatusChange ? 'border-orange-400' : 'border-blue-400'
        }`}
      />

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-0.5">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {formatDistanceToNow(createdAt, { addSuffix: true })}
        </span>
        {activity.isAutomated && (
          <span className="text-xs rounded bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 px-1 py-0.5 leading-none">
            automated
          </span>
        )}
        <a
          href={`/reports?quickOpen=${encodeURIComponent(activity.createdBy)}`}
          className="text-xs text-indigo-500 hover:underline font-mono truncate max-w-[14rem]"
          title={activity.createdBy}
        >
          {activity.createdBy}
        </a>
      </div>

      {/* Content */}
      {isStatusChange ? (
        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
          {activity.fromState ? (
            <StateBadge state={activity.fromState} />
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
          <ArrowRightIcon className="h-3 w-3 text-gray-400 shrink-0" />
          {activity.toState && <StateBadge state={activity.toState} />}
          {activity.note && (
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1 italic">
              &ldquo;{activity.note}&rdquo;
            </span>
          )}
        </div>
      ) : (
        <div className="flex gap-1.5 items-start mt-0.5">
          <ChatBubbleLeftEllipsisIcon className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />
          {activity.note ? (
            <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
              {activity.note}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic">no text</p>
          )}
        </div>
      )}
    </div>
  )
}

export function ActivityTimeline({ reportId }: { reportId: number }) {
  const [expanded, setExpanded] = useState(false)
  const { data: activities, isLoading } = useListActivities(reportId)

  const count = activities?.length ?? 0

  return (
    <div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <span>
          Activity{count > 0 ? ` (${count})` : ''}
        </span>
        {expanded ? (
          <ChevronUpIcon className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronDownIcon className="h-4 w-4 shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
          {isLoading && (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Loading...
            </p>
          )}
          {!isLoading && count === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              No activity yet.
            </p>
          )}
          {count > 0 && (
            <div className="relative">
              {/* Vertical connector line */}
              <div className="absolute left-[5px] top-2 bottom-2 w-px bg-gray-200 dark:bg-gray-700" />
              {activities!.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
