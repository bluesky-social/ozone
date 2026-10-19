'use client'

import { LoadingFailed } from '@/common/Loader'
import { BetaReportsFilters } from '@/reports/Filters'
import { ReportTable } from '@/reports/table'
import { useReportsQuery } from '@/reports/useReportsQuery'

export function ReportsReceived({ did }: { did: string }) {
  const { reports, fetchNextPage, hasNextPage, isInitialLoading, error } =
    useReportsQuery(did)

  return (
    <section aria-label="Reports received" className="py-4">
      <div className="px-4 sm:px-6 lg:px-8 pb-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Reports received
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Reports about this account and its records.
        </p>
      </div>
      <BetaReportsFilters />
      {error ? (
        <LoadingFailed error={error} />
      ) : (
        <ReportTable
          reports={reports}
          showLoadMore={!!hasNextPage}
          onLoadMore={fetchNextPage}
          isInitialLoading={isInitialLoading}
        />
      )}
    </section>
  )
}
