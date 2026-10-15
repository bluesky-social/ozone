import { resolveStatsWindow, type StatsWindow } from './statsWindow'
import {
  LiveStatsParams,
  useHistoricalStats,
  useLiveStats,
} from './useReportStats'

export function useStatsWindow(window: StatsWindow, params?: LiveStatsParams) {
  const live = useLiveStats(params)
  const isToday = window.period === 'Today'
  const history = useHistoricalStats(
    {
      ...params,
      startDate: window.startDate,
      endDate: window.endDate,
      limit: window.days,
    },
    { enabled: !isToday, refetchInterval: 5 * 60 * 1000 },
  )
  return {
    ...resolveStatsWindow(window, live.data, history.data?.stats),
    isLoading: live.isLoading || (!isToday && history.isLoading),
    isError: live.isError || (!isToday && history.isError),
    refetch: () =>
      Promise.all([live.refetch(), ...(!isToday ? [history.refetch()] : [])]),
  }
}

export type WindowStats = ReturnType<typeof useStatsWindow>
