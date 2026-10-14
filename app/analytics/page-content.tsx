'use client'
import { PaginatedGrid } from '@/common/PaginatedGrid'
import { useQueueList } from '@/queues/useQueues'
import { REPORT_CATEGORIES } from '@/reports/stats'
import { OverviewActivity } from '@/reports/stats/OverviewActivity'
import { OverviewStats } from '@/reports/stats/OverviewStats'
import { ReportTypePanels } from '@/reports/stats/ReportTypePanels'
import { QueueAging } from '@/reports/stats/QueueAging'
import { StatsCard } from '@/reports/stats/Stats'
import {
  getStatsWindow,
  STATS_PERIODS,
  StatsPeriod,
  StatsWindow,
} from '@/reports/stats/statsWindow'
import { useStatsWindow } from '@/reports/stats/useStatsWindow'
import { useLiveStats } from '@/reports/stats/useReportStats'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import { useMemo, useState } from 'react'
import { useInterval, useTitle } from 'react-use'
import Link from 'next/link'

export function AnalyticsPageContent() {
  useTitle('Analytics')
  const [period, setPeriod] = useState<StatsPeriod>('Today')
  const [today, setToday] = useState(() =>
    new Date().toISOString().slice(0, 10),
  )
  useInterval(() => setToday(new Date().toISOString().slice(0, 10)), 60_000)
  const window = useMemo(() => getStatsWindow(period, today), [period, today])
  const { data: currentStats } = useLiveStats()

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 text-gray-900 dark:text-gray-100">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Analytics
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          {period === 'Today' && currentStats?.lastUpdated && (
            <span
              data-cy="stats-updated-at"
              className="text-xs text-gray-500 dark:text-gray-400"
              title={new Date(currentStats.lastUpdated).toLocaleString()}
            >
              Updated{' '}
              {new Date(currentStats.lastUpdated).toLocaleTimeString(
                undefined,
                { hour: 'numeric', minute: '2-digit' },
              )}
            </span>
          )}
          <div
            role="group"
            aria-label="Statistics period"
            className="flex rounded-full bg-gray-100 p-1 dark:bg-slate-800"
          >
            {STATS_PERIODS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={period === value}
                title={value === 'QTD' ? 'Quarter to date (UTC)' : undefined}
                onClick={() => setPeriod(value)}
                className={`rounded-full px-3 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 sm:px-4 ${period === value ? 'bg-white font-semibold text-gray-900 shadow-sm dark:bg-slate-600 dark:text-gray-100' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'}`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      </div>

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
            <Overview window={window} />
          </TabPanel>
          <TabPanel>
            <QueueStats window={window} />
          </TabPanel>
          <TabPanel>
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {REPORT_CATEGORIES.map((group) => (
                <StatsCard key={group.title} group={group} window={window} />
              ))}
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  )
}

function Overview({ window }: { window: StatsWindow }) {
  const data = useStatsWindow(window)
  return (
    <>
      <div className="mb-6">
        <OverviewStats window={window} data={data} />
        <Link
          href="/analytics/detail?grouping=aggregate"
          className="mt-3 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          View aggregate details
        </Link>
      </div>
      <OverviewActivity window={window} data={data} />
      <ReportTypePanels window={window} />
      <QueueAging />
    </>
  )
}

function QueueStats({ window }: { window: StatsWindow }) {
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
            window={window}
          />
        )}
      />
    </div>
  )
}
