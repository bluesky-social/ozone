import { useLabelerAgent } from '@/shell/ConfigurationContext'
import type { Agent } from '@atproto/api'
import { useQuery } from '@tanstack/react-query'
import { normalizeStats } from './reportStats'

export type LiveStatsParams = {
  queueId?: number
  moderatorDid?: string
  reportTypes?: string[]
}

export type HistoricalStatsParams = {
  queueId?: number
  moderatorDid?: string
  reportTypes?: string[]
  startDate?: string
  endDate?: string
  limit?: number
  cursor?: string
}

export const liveStatsQueryOptions = (
  labelerAgent: Agent,
  params?: LiveStatsParams,
) => ({
  queryKey: ['report', 'getLiveStats', params],
  queryFn: async () => {
    const { data } = await labelerAgent.tools.ozone.report.getLiveStats(
      params ?? {},
    )
    return normalizeStats(data.stats)
  },
  refetchInterval: 5 * 60 * 1000,
})

export const useLiveStats = (
  params?: LiveStatsParams,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    ...liveStatsQueryOptions(useLabelerAgent(), params),
    ...options,
  })

export const useHistoricalStats = (
  params?: HistoricalStatsParams,
  options: { enabled?: boolean; refetchInterval?: number } = {},
) =>
  useQuery({
    ...historicalStatsQueryOptions(useLabelerAgent(), params),
    ...options,
  })

export const historicalStatsQueryOptions = (
  labelerAgent: Agent,
  params?: HistoricalStatsParams,
) => ({
  queryKey: ['report', 'getHistoricalStats', params],
  queryFn: async () => {
    const { data } = await labelerAgent.tools.ozone.report.getHistoricalStats(
      params ?? {},
    )
    return {
      stats: data.stats.map(normalizeStats),
      cursor: data.cursor,
    }
  },
})
