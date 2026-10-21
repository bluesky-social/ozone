import { describe, expect, it } from 'vitest'
import {
  getDetailStatsWindow,
  matchingDetailStatsPeriod,
  moveDetailStatsWindow,
  type DetailStatsDateRange,
} from './detailStatsWindow'

const today = '2026-09-23'
const dates = (window: DetailStatsDateRange | undefined) => [
  window?.startDate?.slice(0, 10),
  window?.endDate?.slice(0, 10),
]

describe('detail calendar windows', () => {
  it('uses inclusive calendar periods capped at today', () => {
    expect(dates(getDetailStatsWindow('day', today, today))).toEqual([
      today,
      today,
    ])
    expect(dates(getDetailStatsWindow('week', today, today))).toEqual([
      '2026-09-21',
      today,
    ])
    expect(dates(getDetailStatsWindow('month', today, today))).toEqual([
      '2026-09-01',
      today,
    ])
    expect(dates(getDetailStatsWindow('quarter', today, today))).toEqual([
      '2026-07-01',
      today,
    ])
  })

  it('navigates full months without drifting at leap days or year boundaries', () => {
    const march = getDetailStatsWindow('month', '2024-03-31', today)
    const february = moveDetailStatsWindow(march, -1, today)
    expect(dates(february)).toEqual(['2024-02-01', '2024-02-29'])
    expect(moveDetailStatsWindow(february!, 1, today)).toEqual(march)
    const january = getDetailStatsWindow('month', '2024-01-15', today)
    expect(dates(moveDetailStatsWindow(january, -1, today))).toEqual([
      '2023-12-01',
      '2023-12-31',
    ])
  })

  it('moves across UTC week and quarter boundaries', () => {
    const week = getDetailStatsWindow('week', '2025-01-01', today)
    expect(dates(week)).toEqual(['2024-12-30', '2025-01-05'])
    expect(dates(moveDetailStatsWindow(week, -1, today))).toEqual([
      '2024-12-23',
      '2024-12-29',
    ])
    const quarter = getDetailStatsWindow('quarter', '2025-01-01', today)
    expect(dates(moveDetailStatsWindow(quarter, -1, today))).toEqual([
      '2024-10-01',
      '2024-12-31',
    ])
    const day = getDetailStatsWindow('day', '2024-03-01', today)
    expect(dates(moveDetailStatsWindow(day, -1, today))).toEqual([
      '2024-02-29',
      '2024-02-29',
    ])
  })

  it('returns from a complete previous window to the partial current window', () => {
    for (const period of ['day', 'week', 'month', 'quarter'] as const) {
      const current = getDetailStatsWindow(period, today, today)
      const previous = moveDetailStatsWindow(current, -1, today)!
      expect(moveDetailStatsWindow(previous, 1, today)).toEqual(current)
      expect(moveDetailStatsWindow(current, 1, today)).toBeUndefined()
    }
  })

  it('keeps overview ranges exact until a calendar period is chosen', () => {
    const range: DetailStatsDateRange = {
      startDate: '2026-09-16T00:00:00.000Z',
      endDate: '2026-09-22T00:00:00.000Z',
    }
    expect(matchingDetailStatsPeriod(range, today)).toBeUndefined()
    expect(dates(moveDetailStatsWindow(range, -1, today))).toEqual([
      '2026-09-09',
      '2026-09-15',
    ])
    expect(dates(moveDetailStatsWindow(range, 1, today))).toEqual([
      today,
      today,
    ])
    expect(dates(getDetailStatsWindow('month', range.endDate, today))).toEqual([
      '2026-09-01',
      today,
    ])
  })

  it('retains the selected period for bookmarked partial windows as time passes', () => {
    const window = getDetailStatsWindow('quarter', today, today)
    expect(matchingDetailStatsPeriod(window, '2026-10-01', 'quarter')).toBe(
      'quarter',
    )
    expect(matchingDetailStatsPeriod(window, '2026-10-01')).toBeUndefined()
    expect(matchingDetailStatsPeriod(window, today, 'month')).toBeUndefined()
  })

  it('disables navigation for malformed ranges and recovers with a period choice', () => {
    for (const [startDate, endDate] of [
      ['2026-02-30', '2026-03-01'],
      ['2026-09-22', '2026-09-21'],
      ['2026-09-23', undefined],
      ['2027-01-01', '2027-01-31'],
    ]) {
      const range: DetailStatsDateRange = { startDate, endDate }
      expect(moveDetailStatsWindow(range, -1, today)).toBeUndefined()
      expect(moveDetailStatsWindow(range, 1, today)).toBeUndefined()
    }
    expect(dates(getDetailStatsWindow('day', 'not-a-date', today))).toEqual([
      today,
      today,
    ])
    expect(dates(getDetailStatsWindow('day', '2027-01-01', today))).toEqual([
      today,
      today,
    ])
  })
})
