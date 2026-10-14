import {
  summarizeStats,
  type HistoricalReportStats,
  type ReportStats,
} from './reportStats'

export const STATS_PERIODS = ['Today', '7d', '30d', 'QTD'] as const
export type StatsPeriod = (typeof STATS_PERIODS)[number]
export type StatsWindow = ReturnType<typeof getStatsWindow>

const DAY_MS = 86400000

export function getStatsWindow(period: StatsPeriod, today: string) {
  const end = new Date(`${today}T00:00:00.000Z`)
  const start =
    period === 'QTD'
      ? Date.UTC(end.getUTCFullYear(), Math.floor(end.getUTCMonth() / 3) * 3, 1)
      : end.getTime() -
        (period === '7d' ? 6 : period === '30d' ? 29 : 0) * DAY_MS
  const days = Math.round((end.getTime() - start) / DAY_MS) + 1
  return {
    period,
    label:
      period === 'Today'
        ? 'Today'
        : period === 'QTD'
          ? 'Quarter to date'
          : `Last ${days} days`,
    startDate: new Date(start).toISOString(),
    endDate: end.toISOString(),
    days,
    dates: Array.from({ length: days }, (_, i) =>
      new Date(start + i * DAY_MS).toISOString().slice(0, 10),
    ),
  }
}

export function dailyAverage(
  rows: HistoricalReportStats[],
  key: 'inboundCount' | 'closedCount' | 'escalatedCount',
  today: string,
) {
  const completeDays = rows.filter(
    (row) => row.date < today && row[key] != null,
  )
  if (!completeDays.length) return undefined
  return {
    value:
      completeDays.reduce((sum, row) => sum + row[key]!, 0) /
      completeDays.length,
    days: completeDays.length,
  }
}

export function resolveStatsWindow(
  window: StatsWindow,
  live?: ReportStats,
  history: HistoricalReportStats[] = [],
) {
  const today = window.endDate.slice(0, 10)
  const isToday = window.period === 'Today'
  const rows: HistoricalReportStats[] = isToday
    ? live?.lastUpdated?.slice(0, 10) === today
      ? [
          {
            ...live,
            $type: 'tools.ozone.report.defs#historicalStats',
            date: today,
          },
        ]
      : []
    : history
  const summary = summarizeStats(rows)
  return {
    rows,
    stats: {
      ...(isToday ? rows[0] : summary.stats),
      actionRate: summary.stats.actionRate,
      pendingCount: live?.pendingCount,
      closureTargetOverdueCount: live?.closureTargetOverdueCount,
    },
    coverage: summary.coverage,
    lastUpdated: live?.lastUpdated,
  }
}
