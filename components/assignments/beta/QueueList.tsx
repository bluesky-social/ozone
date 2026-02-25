'use client'

import Link from 'next/link'
import { QueueAssigneeStatus } from '../QueueAssigneeStatus'

export function QueueList() {
  const queues = Array.from({ length: 10 }, (_, i) => i + 1)

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Queues
        </h2>
      </div>
      <div className="space-y-3">
        {queues.map((queueId) => (
          <Link
            key={queueId}
            href={`/beta/queues/${queueId}`}
            className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-md border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Queue #{queueId}
            </span>
            <div onClick={(e) => e.preventDefault()}>
              <QueueAssigneeStatus queueId={queueId} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
