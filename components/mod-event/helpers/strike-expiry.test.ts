import { describe, expect, it } from 'vitest'
import {
  needsStrikeExpiry,
  StrikeEventInput,
  withStrikeExpiry,
} from './strike-expiry'

const now = Date.parse('2026-10-19T12:00:00.000Z')
const DAY = 86_400_000
const input = (event = {}): StrikeEventInput => ({
  event: {
    $type: 'tools.ozone.moderation.defs#modEventTakedown',
    strikeCount: 2,
    severityLevel: 'Sev 1',
    ...event,
  },
  modTool: { name: 'ozone-ui/workspace', meta: { batchId: 'batch' } },
})
const levels = (expiryInDays?: number) => ({
  'sev-1': { name: 'Sev 1', expiryInDays },
})

describe('frontend strike expiry', () => {
  it.each([
    ['sev-1', 1],
    ['sev-2', 2],
    ['sev-4', 4],
  ] as const)(
    'uses the saved 180-day policy for %s on actions and reversals',
    (severityLevel, amount) => {
      const settings = Object.fromEntries(
        ['sev-1', 'sev-2', 'sev-4'].map((name) => [
          name,
          { name, expiryInDays: 180 },
        ]),
      )
      for (const [type, strikeCount] of [
        ['modEventTakedown', amount],
        ['modEventEmail', amount],
        ['modEventReverseTakedown', -amount],
      ] as const) {
        const result = withStrikeExpiry(
          input({
            $type: `tools.ozone.moderation.defs#${type}`,
            severityLevel,
            strikeCount,
          }),
          settings,
          now,
        )
        expect(result.event).toMatchObject({
          strikeCount,
          strikeExpiresAt: new Date(now + 180 * DAY).toISOString(),
        })
        expect(result.modTool?.meta).toMatchObject({ strikeExpiryDays: 180 })
      }
    },
  )

  it.each([
    ['modEventTakedown', 2],
    ['modEventEmail', 1],
    ['modEventReverseTakedown', -2],
  ])(
    'adds expiry to %s while retaining the signed amount and tool metadata',
    (type, strikeCount) => {
      const result = withStrikeExpiry(
        input({
          $type: `tools.ozone.moderation.defs#${type}`,
          strikeCount,
        }),
        levels(365),
        now,
      )
      expect(result.event).toMatchObject({
        strikeCount,
        strikeExpiresAt: new Date(now + 365 * DAY).toISOString(),
      })
      expect(result.modTool).toEqual({
        name: 'ozone-ui/workspace',
        meta: { batchId: 'batch', strikeExpiryDays: 365 },
      })
    },
  )

  it('uses a changed severity setting for new events without modifying prior events', () => {
    const saved = withStrikeExpiry(input(), levels(365), now)
    expect(withStrikeExpiry(input(), levels(180), now).event).toMatchObject({
      strikeExpiresAt: new Date(now + 180 * DAY).toISOString(),
    })
    expect(withStrikeExpiry(saved, levels(180), now)).toBe(saved)
  })

  it('preserves explicit expiry, permanent severities and zero-strike warnings', () => {
    for (const value of [
      input({ strikeExpiresAt: '2030-01-01T00:00:00.000Z' }),
      input({ strikeCount: 0 }),
    ]) {
      expect(needsStrikeExpiry(value.event)).toBe(false)
      expect(withStrikeExpiry(value, levels(365), now)).toBe(value)
    }
    const value = input()
    for (const setting of [levels(0), levels(), null]) {
      expect(withStrikeExpiry(value, setting, now)).toBe(value)
    }
    expect(
      needsStrikeExpiry({
        $type: 'tools.ozone.moderation.defs#modEventComment',
      }),
    ).toBe(false)
  })

  it('bases scheduled expiry on the supplied execution time', () => {
    const executionTime = now + 7 * DAY
    expect(
      withStrikeExpiry(input(), levels(180), executionTime).event,
    ).toMatchObject({
      strikeExpiresAt: new Date(executionTime + 180 * DAY).toISOString(),
    })
  })

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER])(
    'rejects unusable duration %s',
    (days) => {
      expect(() => withStrikeExpiry(input(), levels(days), now)).toThrow(
        'Invalid strike expiry duration',
      )
    },
  )
})
