import { describe, expect, it } from 'vitest'
import { getStatsWindow } from './statsWindow'

describe('analytics time windows', () => {
  it('includes today and crosses month and year boundaries in UTC', () => {
    const week = getStatsWindow('7d', '2027-01-02')
    expect(week.startDate).toBe('2026-12-27T00:00:00.000Z')
    expect(week.endDate).toBe('2027-01-02T00:00:00.000Z')
    expect(week.dates).toHaveLength(7)
    expect(getStatsWindow('Today', '2027-01-02').dates).toEqual(['2027-01-02'])
    expect(getStatsWindow('30d', '2024-03-01').dates[0]).toBe('2024-02-01')
  })

  it('includes the entire quarter within the API limit of 100 rows', () => {
    const quarter = getStatsWindow('QTD', '2026-12-31')
    expect(quarter.days).toBe(92)
    expect(quarter.dates[0]).toBe('2026-10-01')
    expect(quarter.dates.at(-1)).toBe('2026-12-31')
    expect(getStatsWindow('QTD', '2027-01-01').days).toBe(1)
  })
})
