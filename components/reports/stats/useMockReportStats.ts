import { ToolsOzoneReportDefs } from '@atproto/api'
import { subDays, subHours } from 'date-fns'
import type { LiveStatsParams, HistoricalStatsParams } from './useReportStats'

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function makeLiveStats(
  params?: LiveStatsParams,
): ToolsOzoneReportDefs.LiveStats {
  // Vary the ranges based on whether params filter to a subset
  const isFiltered = !!(
    params?.queueId ||
    params?.moderatorDid ||
    (params?.reportTypes && params.reportTypes.length > 0)
  )
  const scale = isFiltered ? 0.3 : 1

  const pending = randomInt(Math.round(50 * scale), Math.round(500 * scale))
  const actioned = randomInt(Math.round(200 * scale), Math.round(2000 * scale))
  const escalated = randomInt(Math.round(5 * scale), Math.round(80 * scale))
  const inbound = randomInt(Math.round(20 * scale), Math.round(300 * scale))
  const total = pending + actioned + escalated
  const actionRate = total > 0 ? Math.round((actioned / total) * 100) : 0

  return {
    pendingCount: pending,
    actionedCount: actioned,
    escalatedPendingCount: escalated,
    inboundCount: inbound,
    actionRate,
    avgHandlingTimeSec: randomInt(120, 7200),
    lastUpdated: new Date().toISOString(),
  }
}

function makeHistoricalStats(
  params?: Omit<HistoricalStatsParams, 'cursor'>,
): ToolsOzoneReportDefs.HistoricalStats[] {
  const limit = params?.limit ?? 100
  const end = params?.endDate ? new Date(params.endDate) : new Date()
  const start = params?.startDate
    ? new Date(params.startDate)
    : subDays(end, limit)

  const days = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
  )
  const count = Math.min(days, limit)

  const isFiltered = !!(
    params?.queueId ||
    params?.moderatorDid ||
    (params?.reportTypes && params.reportTypes.length > 0)
  )
  const scale = isFiltered ? 0.3 : 1

  const stats: ToolsOzoneReportDefs.HistoricalStats[] = []
  for (let i = 0; i < count; i++) {
    const date = subHours(end, (count - i) * 24)
    const pending = randomInt(Math.round(40 * scale), Math.round(400 * scale))
    const actioned = randomInt(
      Math.round(150 * scale),
      Math.round(1500 * scale),
    )
    const escalated = randomInt(Math.round(3 * scale), Math.round(60 * scale))
    const inbound = randomInt(Math.round(15 * scale), Math.round(250 * scale))
    const total = pending + actioned + escalated
    const actionRate = total > 0 ? Math.round((actioned / total) * 100) : 0

    stats.push({
      computedAt: date.toISOString(),
      pendingCount: pending,
      actionedCount: actioned,
      escalatedPendingCount: escalated,
      inboundCount: inbound,
      actionRate,
      avgHandlingTimeSec: randomInt(120, 7200),
    })
  }

  return stats
}

type QueryResult<T> = {
  data: T | undefined
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

export const useLiveStats = (params?: LiveStatsParams): QueryResult<ToolsOzoneReportDefs.LiveStats> => {
  return {
    data: makeLiveStats(params),
    isLoading: false,
    isError: false,
    refetch: () => {},
  }
}

export const useHistoricalStats = (
  params?: HistoricalStatsParams,
): QueryResult<{
  stats: ToolsOzoneReportDefs.HistoricalStats[]
  cursor: string | undefined
}> => {
  if (params === undefined) {
    return { data: undefined, isLoading: false, isError: false, refetch: () => {} }
  }
  return {
    data: {
      stats: makeHistoricalStats(params),
      cursor: undefined,
    },
    isLoading: false,
    isError: false,
    refetch: () => {},
  }
}
