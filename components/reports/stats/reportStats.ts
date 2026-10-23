import type { ToolsOzoneReportDefs } from '@atproto/api'

export type ReportStats = Omit<ToolsOzoneReportDefs.LiveStats, '$type'>
export type HistoricalReportStats = ToolsOzoneReportDefs.HistoricalStats
export type StatsCoverage = Partial<Record<keyof ReportStats, number>>

// Older snapshots counted different outcomes and escalation events.
export function normalizeStats<T extends ReportStats>(stats: T): T {
  if (stats.closedCount != null) return stats
  return {
    ...stats,
    actionedCount: undefined,
    actionRate: undefined,
    escalatedCount: undefined,
    avgHandlingTimeSec: undefined,
  }
}

const FLOW_FIELDS = [
  'inboundCount',
  'closedCount',
  'actionedCount',
  'acknowledgedCount',
  'escalatedCount',
  'labelActionCount',
  'tagActionCount',
  'takedownActionCount',
] as const

export function summarizeStats(rows: HistoricalReportStats[]) {
  const days = rows.map(normalizeStats)
  const stats: ReportStats = {}
  const coverage: StatsCoverage = {}

  const sum = (eligible: HistoricalReportStats[], key: keyof ReportStats) =>
    eligible.reduce((total, day) => total + Number(day[key] ?? 0), 0)

  for (const key of FLOW_FIELDS) {
    const eligible = days.filter((day) => day[key] != null)
    coverage[key] = eligible.length
    stats[key] = eligible.length ? sum(eligible, key) : undefined
  }

  const actionDays = days.filter(
    (day) => day.actionedCount != null && day.closedCount != null,
  )
  const closedCount = sum(actionDays, 'closedCount')
  coverage.actionRate = actionDays.length
  stats.actionRate = closedCount
    ? Math.round((sum(actionDays, 'actionedCount') / closedCount) * 100)
    : undefined

  const targetDays = days.filter(
    (day) =>
      day.closureTargetMetCount != null && day.closureTargetMissedCount != null,
  )
  const met = sum(targetDays, 'closureTargetMetCount')
  const missed = sum(targetDays, 'closureTargetMissedCount')
  stats.closureTargetMetCount = targetDays.length ? met : undefined
  stats.closureTargetMissedCount = targetDays.length ? missed : undefined
  stats.closureTargetMetRate =
    met + missed ? Math.round((met / (met + missed)) * 100) : undefined
  coverage.closureTargetMetCount = targetDays.length
  coverage.closureTargetMissedCount = targetDays.length
  coverage.closureTargetMetRate = targetDays.length

  for (const [duration, samples, average] of [
    ['ahtDurationSec', 'ahtSampleCount', 'avgHandlingTimeSec'],
    ['resolutionDurationSec', 'resolutionSampleCount', 'avgResolutionTimeSec'],
  ] as const) {
    const eligible = days.filter(
      (day) =>
        day[duration] != null &&
        day[samples] != null &&
        day.closedCount != null,
    )
    const sampleCount = sum(eligible, samples)
    stats[duration] = eligible.length ? sum(eligible, duration) : undefined
    stats[samples] = eligible.length ? sampleCount : undefined
    stats[average] = sampleCount
      ? Math.round(sum(eligible, duration) / sampleCount)
      : undefined
    coverage[average] = eligible.length
  }

  // Pending and overdue are current snapshots, fetched separately from live stats.
  return { stats, coverage }
}
