import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useQuery } from '@tanstack/react-query'
import type { ReportStats } from './Stats'

export type HistoricalReportStats = ReportStats & {
  date: string
  computedAt?: string
}

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
      return data.stats as ReportStats
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
        stats: data.stats as unknown as HistoricalReportStats[],
        cursor: data.cursor,
      }
    },
  })
}
