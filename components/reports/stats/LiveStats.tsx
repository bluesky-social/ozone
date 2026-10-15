import { OverviewStats } from './OverviewStats'
import { LiveStatsParams, useLiveStats } from './useReportStats'

export function LiveStatsPanel({ params }: { params?: LiveStatsParams }) {
  const { data: stats, isLoading, isError, refetch } = useLiveStats(params)
  return (
    <OverviewStats
      stats={stats ?? {}}
      layout="compact"
      periodLabel="Today"
      isLoading={isLoading}
      isError={isError}
      refetch={refetch}
    />
  )
}
