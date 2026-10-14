import { StatValues } from './Stats'
import { BacklogSummary, StatsSummary } from './StatsSummary'
import { LiveStatsParams, useLiveStats } from './useReportStats'

export function LiveStatsPanel({ params }: { params?: LiveStatsParams }) {
  const { data: stats, isLoading, isError, refetch } = useLiveStats(params)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        Loading stats...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
        Failed to load stats.{' '}
        <button
          onClick={() => refetch()}
          className="underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!stats || !stats.lastUpdated) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        No data available yet
      </div>
    )
  }

  return <StatValues stats={stats} />
}

export function LiveStatsCards({
  params,
  backlogOnly = false,
}: {
  params?: LiveStatsParams
  backlogOnly?: boolean
}) {
  const { data: stats, isLoading, isError, refetch } = useLiveStats(params)

  if (isLoading)
    return <p className="text-sm text-gray-500">Loading current stats...</p>
  if (isError) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        Failed to load current stats.{' '}
        <button onClick={() => refetch()} className="underline">
          Retry
        </button>
      </p>
    )
  }
  if (!stats?.lastUpdated)
    return (
      <p className="text-sm text-gray-500">No current data available yet.</p>
    )

  return (
    <div className="space-y-6">
      {!params?.moderatorDid && <BacklogSummary stats={stats} />}
      {!backlogOnly && (
        <section aria-label="Today’s activity">
          <h2 className="mb-3 text-lg font-semibold">Today (UTC)</h2>
          {stats.closedCount == null && (
            <p className="mb-3 text-sm text-amber-700 dark:text-amber-300">
              Today’s statistics use older metric definitions. Outcome counts
              and timings are unavailable until recomputed.
            </p>
          )}
          <StatsSummary stats={stats} />
        </section>
      )}
    </div>
  )
}
