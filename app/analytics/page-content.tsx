'use client'
import { PaginatedGrid } from '@/common/PaginatedGrid'
import { useQueueList } from '@/queues/useQueues'
import { REPORT_CATEGORIES } from '@/reports/stats'
import { OverviewActivity } from '@/reports/stats/OverviewActivity'
import { OverviewStats } from '@/reports/stats/OverviewStats'
import { StatsCard } from '@/reports/stats/Stats'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import { useMemo } from 'react'
import { useTitle } from 'react-use'
import Link from 'next/link'

export function AnalyticsPageContent() {
  useTitle('Analytics')

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 text-gray-900 dark:text-gray-100">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Analytics
      </h1>

      <TabGroup>
        <TabList
          aria-label="Analytics views"
          className="mb-6 flex gap-6 overflow-x-auto border-b border-gray-200 dark:border-slate-700"
        >
          {['Overview', 'Queues', 'Categories'].map((label) => (
            <Tab
              key={label}
              className="whitespace-nowrap border-b-[3px] border-transparent pb-3 pt-1 text-[15px] font-medium tracking-tight text-gray-500 hover:text-gray-900 data-[selected]:border-blue-600 data-[selected]:font-semibold data-[selected]:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-500 dark:text-gray-400 dark:hover:text-gray-100 dark:data-[selected]:border-blue-400 dark:data-[selected]:text-gray-100"
            >
              {label}
            </Tab>
          ))}
        </TabList>
        <TabPanels>
          <TabPanel>
            <div className="mb-6">
              <OverviewStats />
              <Link
                href="/analytics/detail?grouping=aggregate"
                className="mt-3 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
              >
                View aggregate details
              </Link>
            </div>
            <OverviewActivity />
          </TabPanel>
          <TabPanel>
            <QueueStats />
          </TabPanel>
          <TabPanel>
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {REPORT_CATEGORIES.map((group) => (
                <StatsCard key={group.title} group={group} />
              ))}
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  )
}

function QueueStats() {
  const { data, hasNextPage, fetchNextPage, isLoading, isError, refetch } =
    useQueueList()
  const queues = useMemo(
    () => data?.pages.flatMap((page) => page.queues) ?? [],
    [data],
  )

  if (isLoading) {
    return (
      <p role="status" className="text-sm text-gray-500 dark:text-gray-400">
        Loading queues...
      </p>
    )
  }
  if (isError) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        Failed to load queues.{' '}
        <button type="button" onClick={() => refetch()} className="underline">
          Retry
        </button>
      </p>
    )
  }
  if (!queues.length) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No queues available.
      </p>
    )
  }

  return (
    <div className="mb-6">
      <PaginatedGrid
        items={queues}
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
        renderItem={(queue) => (
          <StatsCard
            key={queue.id}
            group={{ title: queue.name, queueId: queue.id }}
          />
        )}
      />
    </div>
  )
}
