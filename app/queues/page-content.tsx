'use client'
import Link from 'next/link'
import { useTitle } from 'react-use'
import {
  ChartBarIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import { ActionButton } from '@/common/buttons'
import { useQueueList } from '@/queues/useQueues'
import { QueueList } from '@/queues/QueueList'
import { usePermission } from '@/shell/ConfigurationContext'
import { LiveStatsPanel } from '@/reports/stats/LiveStats'

export function QueuesPageContent() {
  const canManageQueues = usePermission('canManageQueues')

  useTitle('Queues')

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage } =
    useQueueList({ enabled: true })
  const queues = data?.pages.flatMap((page) => page.queues) ?? []

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl mb-3 border-b border-gray-200 dark:border-gray-700 pb-3">
        <div className="w-full flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Queues
          </h1>
          <div className="flex items-center gap-2">
            <Link href="/analytics">
              <ActionButton size="sm" appearance="outlined">
                <ChartBarIcon className="h-4 w-4 mr-1" />
                Analytics
              </ActionButton>
            </Link>
            <Link href="/configure?tab=queues" hidden={!canManageQueues}>
              <ActionButton size="sm" appearance="outlined">
                <WrenchScrewdriverIcon className="h-4 w-4 mr-1" />
                Configure
              </ActionButton>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="w-full max-w-4xl mb-3">
        <LiveStatsPanel />
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
          hiddenFields={['enabled']}
        />
      </div>
    </div>
  )
}
