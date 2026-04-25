import { QueueCard } from '@/queues/QueueCard'
import { ToolsOzoneQueueDefs } from '@atproto/api'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid'
import { useState } from 'react'

export function QueueFilterBar({
  queue,
  onClear,
}: {
  queue: ToolsOzoneQueueDefs.QueueView
  onClear: () => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-4">
      {queue && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              title={
                isExpanded ? 'Collapse queue details' : 'Expand queue details'
              }
            >
              {isExpanded ? (
                <ChevronUpIcon className="h-4 w-4" />
              ) : (
                <ChevronDownIcon className="h-4 w-4" />
              )}
            </button>
            <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">
              {queue.name}
            </h3>
            <span
              className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                queue.enabled
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {queue.enabled ? 'Enabled' : 'Disabled'}
            </span>
            {queue.stats.pendingCount !== undefined && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                <strong>{queue.stats.pendingCount}</strong> pending
              </span>
            )}
            <div className="ml-auto">
              <button
                onClick={onClear}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Clear queue filter"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
          {isExpanded && (
            <div className="border-t border-gray-200 dark:border-gray-700">
              <QueueCard
                queue={queue}
                hiddenFields={['name', 'enabled']}
                hideViewReports
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
