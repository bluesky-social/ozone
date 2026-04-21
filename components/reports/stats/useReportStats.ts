import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { ToolsOzoneReportDefs } from '@atproto/api'
import { useQuery } from '@tanstack/react-query'

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
    queryFn: async () => {
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
    queryFn: async () => {
      const { data } = await labelerAgent.tools.ozone.report.getHistoricalStats(
        params ?? {},
      )
      return {
        stats: data.stats as ToolsOzoneReportDefs.HistoricalStats[],
        cursor: data.cursor,
      }
    },
  })
}
