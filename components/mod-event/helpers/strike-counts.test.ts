import { describe, expect, it } from 'vitest'
import { countStrikes } from './strike-counts'

const expiry = '2026-10-15T12:00:00.000Z'
const now = Date.parse(expiry)
const event = (strikeCount: number, strikeExpiresAt?: string) => ({
  event: { strikeCount, strikeExpiresAt },
})

describe('stored strike expiries', () => {
  it('expires a strike at its stored timestamp, retaining its lifetime contribution', () => {
    expect(countStrikes([event(2, expiry)], now - 1)).toEqual({
      activeStrikeCount: 2,
      totalStrikeCount: 2,
    })
    expect(countStrikes([event(2, expiry)], now)).toEqual({
      activeStrikeCount: 0,
      totalStrikeCount: 2,
    })
  })

  it("uses each signed adjustment's own saved expiry", () => {
    const reversalExpiry = now + 86_400_000
    const events = [
      event(2, expiry),
      event(-2, new Date(reversalExpiry).toISOString()),
    ]
    expect(countStrikes(events, now - 1)).toEqual({
      activeStrikeCount: 0,
      totalStrikeCount: 0,
    })
    expect(countStrikes(events, now)).toEqual({
      activeStrikeCount: -2,
      totalStrikeCount: 0,
    })
    expect(countStrikes(events, reversalExpiry)).toEqual({
      activeStrikeCount: 0,
      totalStrikeCount: 0,
    })
  })

  it('uses saved expiry after a manual repair and preserves explicit expiries', () => {
    const events = [
      event(1, '2026-10-14T12:00:00.000Z'),
      event(2, '2030-01-01T00:00:00.000Z'),
    ]
    expect(countStrikes(events, now)).toEqual({
      activeStrikeCount: 2,
      totalStrikeCount: 3,
    })
  })

  it('treats missing expiry as permanent and ignores events without strikes', () => {
    expect(
      countStrikes([event(4), event(0), { event: {} }, { event: null }], now),
    ).toEqual({ activeStrikeCount: 4, totalStrikeCount: 4 })
  })
})
