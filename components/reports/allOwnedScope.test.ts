import { describe, expect, it } from 'vitest'
import { MOD_EVENTS } from '@/mod-event/constants'
import { canTargetAllOwned } from './allOwnedScope'

describe('account-wide report targeting', () => {
  it.each([MOD_EVENTS.LABEL, MOD_EVENTS.TAKEDOWN, MOD_EVENTS.REVERSE_TAKEDOWN])(
    'allows %s only when the action targets an account',
    (eventType) => {
      expect(canTargetAllOwned(true, eventType)).toBe(true)
      expect(canTargetAllOwned(false, eventType)).toBe(false)
    },
  )

  it.each([MOD_EVENTS.ACKNOWLEDGE, MOD_EVENTS.ESCALATE, MOD_EVENTS.COMMENT])(
    'does not retain account-wide scope when switching to %s',
    (eventType) => {
      expect(canTargetAllOwned(true, eventType)).toBe(false)
    },
  )
})
