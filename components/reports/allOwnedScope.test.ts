import { describe, expect, it } from 'vitest'
import { MOD_EVENTS } from '../mod-event/constants'
import { canTargetAllOwned } from './allOwnedScope'

describe('account-wide report closure eligibility', () => {
  it.each([MOD_EVENTS.LABEL, MOD_EVENTS.TAKEDOWN, MOD_EVENTS.REVERSE_TAKEDOWN])(
    'allows account-wide closure for an account %s event',
    (eventType) => {
      expect(canTargetAllOwned(true, eventType)).toBe(true)
      expect(canTargetAllOwned(false, eventType)).toBe(false)
    },
  )

  it.each([
    MOD_EVENTS.ACKNOWLEDGE,
    MOD_EVENTS.COMMENT,
    MOD_EVENTS.ESCALATE,
    MOD_EVENTS.RESOLVE_APPEAL,
    MOD_EVENTS.EMAIL,
    MOD_EVENTS.TAG,
    undefined,
  ])('does not allow account-wide closure for %s', (eventType) => {
    expect(canTargetAllOwned(true, eventType)).toBe(false)
  })
})
