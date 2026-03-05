'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useTitle } from 'react-use'
import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline'
import { ActionButton } from '@/common/buttons'
import { Input, Select } from '@/common/forms'
import { useQueueList, QueueListFilters } from '@/queues/useQueues'
import { ReportTypeMultiselect } from '@/reports/ReportTypeMultiselect'
import { QueueListReadonly } from '@/queues/QueueListReadonly'

export function QueuesPageContent() {
  useTitle('Queues')

  const [filters, setFilters] = useState<QueueListFilters>({})
  const updateFilter = <K extends keyof QueueListFilters>(
    key: K,
    value: QueueListFilters[K],
  ) => setFilters((prev) => ({ ...prev, [key]: value }))

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage } =
    useQueueList(filters)
  const queues = data?.pages.flatMap((page) => page.queues) ?? []

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4">
      <div className="flex items-center justify-between mb-4">
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

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Select
          className="text-xs"
          value={
            filters.enabled === undefined
              ? 'all'
              : filters.enabled
                ? 'enabled'
                : 'disabled'
          }
          onChange={(e) => {
            const val = e.target.value
            updateFilter(
              'enabled',
              val === 'all' ? undefined : val === 'enabled',
            )
          }}
        >
          <option value="all">All</option>
          <option value="enabled">Enabled</option>
          <option value="disabled">Disabled</option>
        </Select>
        <Select
          className="text-xs"
          value={filters.subjectType ?? 'all'}
          onChange={(e) => {
            const val = e.target.value
            updateFilter('subjectType', val === 'all' ? undefined : val)
          }}
        >
          <option value="all">All subjects</option>
          <option value="account">account</option>
          <option value="record">record</option>
          <option value="message">message</option>
        </Select>
        <Input
          type="text"
          className="min-w-[10rem] flex-1 text-sm"
          placeholder="collection (e.g. app.bsky.feed.post)"
          value={filters.collection ?? ''}
          onChange={(e) =>
            updateFilter('collection', e.target.value || undefined)
          }
        />
      </div>

      <div className="mb-4 flex items-center gap-2">
        <div className="flex-1">
          <ReportTypeMultiselect
            value={filters.reportTypes ?? []}
            onChange={(val) => updateFilter('reportTypes', val)}
          />
        </div>
        <ActionButton
          type="button"
          size="md"
          appearance="outlined"
          onClick={() => setFilters({})}
        >
          <p className="text-xs">Reset Filters</p>
        </ActionButton>
      </div>

      {isError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded text-red-700 dark:text-red-300 text-sm">
          Failed to load queues.{' '}
          <button className="underline" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      )}

      <QueueListReadonly
        queues={queues}
        isLoading={isLoading}
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage}
      />
    </div>
  )
}
