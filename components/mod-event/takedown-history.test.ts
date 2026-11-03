import { describe, expect, it } from 'vitest'
import { MOD_EVENTS } from './constants'
import { getTakedownHistoryFilters } from './useModEventList'

describe('takedown history shortcuts', () => {
  it.each([true, false])(
    'includes takedowns and reversals for a DID (all: %s)',
    (all) => {
      const filters = getTakedownHistoryFilters('did:plc:alice', all)
      expect(filters).toMatchObject({
        subject: 'did:plc:alice',
        includeAllUserRecords: all,
        types: [MOD_EVENTS.TAKEDOWN, MOD_EVENTS.REVERSE_TAKEDOWN],
        reportTypes: [],
        policies: [],
        withStrike: false,
        subjectType: undefined,
      })
    },
  )

  it('uses the author DID when opened from a record', () => {
    expect(
      getTakedownHistoryFilters(
        'at://did:plc:alice/app.bsky.feed.post/1',
        false,
      )?.subject,
    ).toBe('did:plc:alice')
  })

  it('does not offer a shortcut without a subject DID', () => {
    expect(getTakedownHistoryFilters(undefined, true)).toBeUndefined()
    expect(
      getTakedownHistoryFilters('at://example.com/app.bsky.feed.post/1', true),
    ).toBeUndefined()
    expect(getTakedownHistoryFilters('not a subject', true)).toBeUndefined()
  })
})
