import { describe, expect, it } from 'vitest'
import {
  activityFilterError,
  activityParams,
  moderatorStatsParams,
  readModeratorFilters,
  reportReviewHref,
  writeModeratorFilters,
} from './moderatorActivity'
import { getStatsWindow } from './stats/statsWindow'

const day = '2026-04-05'
describe('moderator review state', () => {
  it.each([
    ['Today', '2026-04-05'],
    ['7d', '2026-03-30'],
    ['30d', '2026-03-07'],
    ['QTD', '2026-04-01'],
  ] as const)(
    'uses the same UTC %s period for stats and activity',
    (period, start) => {
      const filters = readModeratorFilters(new URLSearchParams({ period }))
      const window = getStatsWindow(filters.period, day)
      expect(moderatorStatsParams(filters.moderatorDid, window)).toMatchObject({
        startDate: `${start}T00:00:00.000Z`,
        endDate: '2026-04-05T00:00:00.000Z',
      })
      expect(activityParams(filters, window)).toMatchObject({
        createdAfter: `${start}T00:00:00.000Z`,
        createdBefore: '2026-04-06T00:00:00.000Z',
      })
    },
  )

  it('includes the final UTC day across a year boundary', () => {
    const filters = readModeratorFilters(new URLSearchParams())
    expect(filters.period).toBe('Today')
    expect(
      activityParams(filters, getStatsWindow('Today', '2026-12-31')),
    ).toMatchObject({
      createdAfter: '2026-12-31T00:00:00.000Z',
      createdBefore: '2027-01-01T00:00:00.000Z',
    })
  })

  it('retains the actor and activity types while replacing obsolete view and date filters', () => {
    const params = new URLSearchParams(
      'tab=moderators&view=live&activityRange=custom&activityStart=bad&activityEnd=bad&activityQueue=42&includeAutomated=true&moderatorDid=did:example:moderator',
    )
    const filters = {
      ...readModeratorFilters(params),
      types: ['noteActivity', 'tools.ozone.moderation.defs#modEventLabel'],
      period: '30d' as const,
    }
    const next = writeModeratorFilters(params, filters)
    expect(readModeratorFilters(next)).toEqual({
      ...filters,
      types: [...filters.types].sort(),
    })
    expect(next.get('tab')).toBe('moderators')
    expect(
      writeModeratorFilters(next, { ...filters, moderatorDid: '' }).has(
        'moderatorDid',
      ),
    ).toBe(false)
    for (const key of [
      'view',
      'activityRange',
      'activityStart',
      'activityEnd',
      'activityQueue',
      'includeAutomated',
    ])
      expect(next.has(key)).toBe(false)
  })

  it('keeps activity types out of moderator statistics', () => {
    const filters = readModeratorFilters(
      new URLSearchParams(
        'moderatorDid=did:example:moderator&activityQueue=42&includeAutomated=true&activityType=closeActivity',
      ),
    )
    const window = getStatsWindow('7d', day)
    expect(activityParams(filters, window)).toMatchObject({
      types: ['closeActivity'],
    })
    expect(activityParams(filters, window)).not.toHaveProperty('queueId')
    expect(activityParams(filters, window)).not.toHaveProperty(
      'includeAutomated',
    )
    expect(moderatorStatsParams(filters.moderatorDid, window)).toEqual({
      moderatorDid: filters.moderatorDid,
      startDate: '2026-03-30T00:00:00.000Z',
      endDate: '2026-04-05T00:00:00.000Z',
      limit: 100,
    })
  })

  it('rejects too many activity types', () => {
    const filters = readModeratorFilters(new URLSearchParams())
    expect(activityFilterError(filters)).toBeUndefined()
    expect(
      activityFilterError({
        ...filters,
        types: Array.from({ length: 41 }, (_, i) => `type${i}`),
      }),
    ).toBe('Choose at most 40 activity types.')
  })

  it('preserves the directory queue across moderator selection without scoping stats or history', () => {
    const params = new URLSearchParams('tab=moderators&memberQueue=42')
    const filters = {
      ...readModeratorFilters(params),
      moderatorDid: 'did:example:moderator',
    }
    expect(filters.memberQueueId).toBe(42)
    const selected = writeModeratorFilters(params, filters)
    const directory = writeModeratorFilters(selected, {
      ...filters,
      moderatorDid: '',
    })
    expect(directory.get('memberQueue')).toBe('42')
    expect(
      activityParams(filters, getStatsWindow('Today', day)),
    ).not.toHaveProperty('queueId')
    expect(
      moderatorStatsParams(filters.moderatorDid, getStatsWindow('Today', day)),
    ).not.toHaveProperty('queueId')
    expect(
      writeModeratorFilters(directory, {
        ...filters,
        memberQueueId: undefined,
      }).has('memberQueue'),
    ).toBe(false)
    for (const invalid of ['bad', '-1', '0', '1.2']) {
      expect(
        readModeratorFilters(new URLSearchParams({ memberQueue: invalid }))
          .memberQueueId,
      ).toBeUndefined()
    }
  })

  it('opens reports without automatic viewer registration', () => {
    expect(reportReviewHref(42)).toBe('/reports/42?activityReview=true')
  })
})
