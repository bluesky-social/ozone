'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useTitle } from 'react-use'
import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline'
import { ActionButton } from '@/common/buttons'
import { useQueueList, QueueListFilters } from '@/queues/useQueues'
import { QueueFilters } from '@/queues/QueueFilters'
import { QueueList } from '@/queues/QueueList'

export function QueuesPageContent() {
  useTitle('Queues')

  const [filters, setFilters] = useState<QueueListFilters>({})

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage } =
    useQueueList(filters)
  const queues = data?.pages.flatMap((page) => page.queues) ?? []

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 flex flex-col items-center">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Queues
        </h1>
        <Link href="/configure?tab=queues">
          <ActionButton size="sm" appearance="outlined">
            <WrenchScrewdriverIcon className="h-4 w-4 mr-1" />
            Configure
          </ActionButton>
        </Link>
      </div>

      {/* Filters */}
      <div className="w-full max-w-4xl mb-4">
        <QueueFilters filters={filters} onChange={setFilters} />
      </div>

      {/* Queue list */}
      <div className="w-full max-w-4xl">
        {isError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded text-red-700 dark:text-red-300 text-sm">
            Failed to load queues.{' '}
            <button className="underline" onClick={() => refetch()}>
              Retry
            </button>
          </div>
        )}
        <QueueList
          queues={queues}
          isLoading={isLoading}
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
        />
      </div>
    </div>
  )
}
