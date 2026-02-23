'use client'

import { useState } from 'react'
import { ActionButton } from '@/common/buttons'
import { QueueAssigneeStatus } from '../QueueAssigneeStatus'

export function QueueList() {
  const [queues, setQueues] = useState<number[]>([1])

  const addQueue = () => {
    setQueues((prev) => [...prev, (prev[prev.length - 1] ?? 0) + 1])
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Queues
        </h2>
        <ActionButton appearance="primary" size="sm" onClick={addQueue}>
          Add Queue
        </ActionButton>
      </div>
      <div className="space-y-3">
        {queues.map((queueId) => (
          <div
            key={queueId}
            className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-md border border-gray-200 dark:border-slate-700"
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Queue #{queueId}
            </span>
            <QueueAssigneeStatus queueId={queueId} />
          </div>
        ))}
      </div>
    </div>
  )
}
