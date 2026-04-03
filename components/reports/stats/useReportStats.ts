import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useQuery } from '@tanstack/react-query'
import { ToolsOzoneReportDefs } from '@atproto/api'
import { makeHistoricalStats, makeLiveStats } from './mock-stats'

const USE_MOCKS = false

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

export const useLiveStats = (params?: LiveStatsParams) => {
  const labelerAgent = useLabelerAgent()

  return useQuery({
    queryKey: ['report', 'getLiveStats', params],
    queryFn: USE_MOCKS
      ? async () => makeLiveStats(params)
      : async () => {
          const { data } = await labelerAgent.tools.ozone.report.getLiveStats(
            params ?? {},
          )
          return data.stats
        },
    refetchInterval: 5 * 60 * 1000,
  })
}

export const useHistoricalStats = (params?: HistoricalStatsParams) => {
  const labelerAgent = useLabelerAgent()

  return useQuery({
    queryKey: ['report', 'getHistoricalStats', params],
    queryFn: USE_MOCKS
      ? async () => makeHistoricalStats(params)
      : async () => {
          const { data } =
            await labelerAgent.tools.ozone.report.getHistoricalStats(
              params ?? {},
            )
          return {
            stats: data.stats as ToolsOzoneReportDefs.HistoricalStats[],
            cursor: data.cursor,
          }
        },
  })
}
