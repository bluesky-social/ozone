import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
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

// Older snapshots used different definitions for these metrics.
function normalizeStats<T extends ReportStats>(stats: T): T {
  if (stats.closedCount != null) return stats
  return {
    ...stats,
    actionedCount: undefined,
    actionRate: undefined,
    escalatedCount: undefined,
    avgHandlingTimeSec: undefined,
  }
}

export const useLiveStats = (params?: LiveStatsParams) => {
  const labelerAgent = useLabelerAgent()

  return useQuery({
    queryKey: ['report', 'getLiveStats', params],
    queryFn: async () => {
      const { data } = await labelerAgent.tools.ozone.report.getLiveStats(
        params ?? {},
      )
      return normalizeStats(data.stats as ReportStats)
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
        stats: (data.stats as unknown as HistoricalReportStats[]).map(
          normalizeStats,
        ),
        cursor: data.cursor,
      }
    },
  })
}

export function getStatsRefreshDates(startDate?: string, endDate?: string) {
  const start = startDate?.split('T')[0] ?? ''
  const end = endDate?.split('T')[0] ?? ''
  const dates = [start, end].map((date) => new Date(`${date}T00:00:00.000Z`))
  if (
    [start, end].some(
      (date, i) =>
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(dates[i].getTime()) ||
        dates[i].toISOString().slice(0, 10) !== date,
    )
  ) {
    return []
  }
  const days = (dates[1].getTime() - dates[0].getTime()) / 86400000 + 1
  if (days < 1 || days > 100) return []
  return Array.from({ length: days }, (_, i) =>
    new Date(dates[0].getTime() + i * 86400000).toISOString().slice(0, 10),
  )
}

export function useRefreshStats() {
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()
  const [progress, setProgress] = useState({ completed: 0, total: 0 })
  const mutation = useMutation({
    retry: false,
    mutationFn: async (range: { startDate: string; endDate: string }) => {
      const dates = getStatsRefreshDates(range.startDate, range.endDate)
      if (!dates.length) throw new Error('Select between 1 and 100 days.')
      setProgress({ completed: 0, total: dates.length })
      for (const [i, date] of dates.entries()) {
        try {
          // Refresh every group together so queue and aggregate totals agree.
          await labelerAgent.tools.ozone.report.refreshStats({
            startDate: date,
            endDate: date,
          })
        } catch (error) {
          const reason =
            error instanceof Error ? error.message : 'Request failed'
          throw new Error(
            `Recomputation stopped on ${date}. ${i} of ${dates.length} days completed. ${reason}`,
          )
        }
        setProgress({ completed: i + 1, total: dates.length })
      }
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['report', 'getLiveStats'] }),
        queryClient.invalidateQueries({
          queryKey: ['report', 'getHistoricalStats'],
        }),
        queryClient.invalidateQueries({ queryKey: ['queues'] }),
      ])
    },
  })
  return { ...mutation, progress }
}
