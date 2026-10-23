import { describe, expect, it } from 'vitest'
import {
  HistoricalReportStats,
  normalizeStats,
  summarizeStats,
} from './reportStats'

const day: HistoricalReportStats = {
  date: '2026-10-10',
  inboundCount: 10,
  pendingCount: 100,
  closedCount: 10,
  actionedCount: 2,
  acknowledgedCount: 8,
  escalatedCount: 1,
  closureTargetMetCount: 1,
  closureTargetMissedCount: 1,
  closureTargetOverdueCount: 20,
  ahtDurationSec: 600,
  ahtSampleCount: 2,
  resolutionDurationSec: 6000,
  resolutionSampleCount: 10,
}
const legacy: HistoricalReportStats = {
  date: '2026-10-09',
  inboundCount: 100,
  pendingCount: 500,
  actionedCount: 900,
  actionRate: 900,
  escalatedCount: 80,
  avgHandlingTimeSec: 10000,
}

describe('report stats range summaries', () => {
  it('sums activity and weights rates and durations by their own samples', () => {
    const result = summarizeStats([
      day,
      {
        ...day,
        date: '2026-10-11',
        closedCount: 90,
        actionedCount: 81,
        acknowledgedCount: 9,
        closureTargetMetCount: 18,
        closureTargetMissedCount: 0,
        ahtDurationSec: 800,
        ahtSampleCount: 8,
        resolutionDurationSec: 9000,
        resolutionSampleCount: 90,
      },
    ])
    expect(result.stats).toMatchObject({
      inboundCount: 20,
      closedCount: 100,
      actionedCount: 83,
      acknowledgedCount: 17,
      actionRate: 83,
      closureTargetMetCount: 19,
      closureTargetMissedCount: 1,
      closureTargetMetRate: 95,
      avgHandlingTimeSec: 140,
      avgResolutionTimeSec: 150,
    })
    expect(result.coverage.closureTargetMetRate).toBe(2)
  })

  it('never includes daily pending or overdue in the range summary', () => {
    const result = summarizeStats([
      day,
      {
        ...day,
        date: '2026-10-11',
        pendingCount: 1,
        closureTargetOverdueCount: 0,
      },
    ])
    expect(result.stats).not.toHaveProperty('pendingCount')
    expect(result.stats).not.toHaveProperty('closureTargetOverdueCount')
  })

  it('preserves unavailable lifecycle metrics for legacy-only ranges', () => {
    const { stats, coverage } = summarizeStats([legacy])
    expect(stats.inboundCount).toBe(100)
    for (const key of [
      'closedCount',
      'actionedCount',
      'escalatedCount',
      'actionRate',
      'closureTargetMetCount',
      'closureTargetMetRate',
      'avgHandlingTimeSec',
    ] as const) {
      expect(stats[key]).toBeUndefined()
      expect(coverage[key]).toBe(0)
    }
  })

  it('uses compatible definitions and reports partial coverage for mixed ranges', () => {
    const { stats, coverage } = summarizeStats([legacy, day])
    expect(stats).toMatchObject({
      inboundCount: 110,
      closedCount: 10,
      actionedCount: 2,
      escalatedCount: 1,
      actionRate: 20,
      closureTargetMetRate: 50,
      avgHandlingTimeSec: 300,
    })
    expect(coverage.inboundCount).toBe(2)
    expect(coverage.actionRate).toBe(1)
    expect(coverage.avgHandlingTimeSec).toBe(1)
  })

  it('requires matching numerator and denominator coverage for action rate', () => {
    const { stats, coverage } = summarizeStats([
      day,
      { date: '2026-10-11', closedCount: 100 },
    ])
    expect(stats.closedCount).toBe(110)
    expect(stats.actionRate).toBe(20)
    expect(coverage.actionRate).toBe(1)
  })

  it('requires both closure-target components, including when one is zero', () => {
    const { stats, coverage } = summarizeStats([
      day,
      { date: '2026-10-11', closedCount: 10, closureTargetMetCount: 0 },
    ])
    expect(stats.closureTargetMetCount).toBe(1)
    expect(stats.closureTargetMissedCount).toBe(1)
    expect(stats.closureTargetMetRate).toBe(50)
    expect(coverage.closureTargetMetCount).toBe(1)
  })

  it('excludes incomplete duration pairs without using daily averages as fallback', () => {
    const { stats, coverage } = summarizeStats([
      day,
      {
        date: '2026-10-11',
        closedCount: 10,
        ahtSampleCount: 100,
        resolutionDurationSec: 100000,
        avgHandlingTimeSec: 900,
      },
      {
        date: '2026-10-12',
        closedCount: 10,
        ahtDurationSec: 100000,
        resolutionSampleCount: 100,
        avgResolutionTimeSec: 10000,
      },
    ])
    expect(stats.avgHandlingTimeSec).toBe(300)
    expect(stats.avgResolutionTimeSec).toBe(600)
    expect(stats.ahtSampleCount).toBe(2)
    expect(stats.resolutionSampleCount).toBe(10)
    expect(coverage.avgHandlingTimeSec).toBe(1)
  })

  it('shows zero counts but unavailable rates and durations when there are no samples', () => {
    const { stats, coverage } = summarizeStats([
      {
        date: day.date,
        closedCount: 0,
        actionedCount: 0,
        closureTargetMetCount: 0,
        closureTargetMissedCount: 0,
        ahtDurationSec: 0,
        ahtSampleCount: 0,
      },
    ])
    expect(stats.closureTargetMetCount).toBe(0)
    expect(stats.closureTargetMetRate).toBeUndefined()
    expect(stats.actionRate).toBeUndefined()
    expect(stats.avgHandlingTimeSec).toBeUndefined()
    expect(coverage.closureTargetMetRate).toBe(1)
  })

  it('preserves a zero-second duration when samples exist', () => {
    expect(
      summarizeStats([{ ...day, ahtDurationSec: 0 }]).stats.avgHandlingTimeSec,
    ).toBe(0)
  })

  it('returns unavailable values for empty ranges', () => {
    expect(summarizeStats([]).stats.inboundCount).toBeUndefined()
  })

  it('does not mutate API rows when suppressing legacy values', () => {
    expect(normalizeStats(legacy).actionedCount).toBeUndefined()
    expect(legacy.actionedCount).toBe(900)
  })
})
