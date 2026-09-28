import type { ToolsOzoneModerationEmitEvent } from '@atproto/api'
import { XRPCError } from '@atproto/xrpc'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MOD_EVENTS } from '../constants'
import {
  getAccountTakedownState,
  getNextAccountTakedownState,
  submitRecordTakedown,
  type AccountTakedownStatus,
  type AccountTakedownOutcome,
  type TakedownState,
} from './takedown'

const HOUR = 60 * 60 * 1000
const now = Date.parse('2026-09-28T12:00:00Z')
const none: TakedownState = { type: 'none' }
const permanent: TakedownState = { type: 'permanent' }
const temporary = (hours: number): TakedownState => ({
  type: 'temporary',
  expiresAt: now + hours * HOUR,
})
const suspended = (hours: number): AccountTakedownStatus => ({
  takendown: true,
  suspendUntil: new Date(now + hours * HOUR).toISOString(),
})
const recommendation = {
  isPermanent: false,
  thresholdCrossed: 8,
  suspensionDurationInHours: 72,
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(now)
})
afterEach(() => vi.useRealTimers())

describe('recommended account takedown state', () => {
  it('distinguishes active, suspended, and permanently taken down accounts', () => {
    expect(getAccountTakedownState()).toEqual(none)
    expect(getAccountTakedownState({ takendown: false })).toEqual(none)
    expect(getAccountTakedownState(suspended(24))).toEqual(temporary(24))
    expect(getAccountTakedownState({ takendown: true })).toEqual(permanent)
  })

  it.each([
    [none, recommendation, temporary(72)],
    [temporary(24), recommendation, temporary(96)],
    [temporary(72), recommendation, temporary(144)],
    [temporary(100), recommendation, temporary(172)],
    [temporary(-12), recommendation, temporary(72)],
    [temporary(0.5), recommendation, temporary(72.5)],
    [permanent, recommendation, permanent],
    [temporary(24), { ...recommendation, isPermanent: true }, permanent],
    [none, { ...recommendation, isPermanent: true }, permanent],
    [
      temporary(24),
      { ...recommendation, thresholdCrossed: undefined },
      temporary(24),
    ],
    [none, { ...recommendation, thresholdCrossed: undefined }, none],
    [
      temporary(24),
      { ...recommendation, isPermanent: true, thresholdCrossed: undefined },
      permanent,
    ],
    [temporary(24), null, temporary(24)],
  ])('calculates %j with %j as %j', (current, recommended, expected) => {
    expect(getNextAccountTakedownState(current, recommended)).toEqual(expected)
  })

  it('adds a newly triggered seven days to two days remaining', () => {
    expect(
      getNextAccountTakedownState(temporary(48), {
        ...recommendation,
        suspensionDurationInHours: 168,
      }),
    ).toEqual(temporary(216))
  })
})

const primaryAction: ToolsOzoneModerationEmitEvent.InputSchema = {
  createdBy: 'did:plc:moderator',
  subject: {
    $type: 'com.atproto.repo.strongRef',
    uri: 'at://did:plc:author/app.bsky.feed.post/example',
    cid: 'example',
  },
  event: {
    $type: MOD_EVENTS.TAKEDOWN,
    policies: ['spam'],
    strikeCount: 1,
  },
}
const accountAction: ToolsOzoneModerationEmitEvent.InputSchema = {
  createdBy: primaryAction.createdBy,
  subject: { $type: 'com.atproto.admin.defs#repoRef', did: 'did:plc:author' },
  event: {
    $type: MOD_EVENTS.TAKEDOWN,
    policies: ['spam'],
    targetServices: ['appview'],
  },
}

function setup(status: AccountTakedownStatus = { takendown: false }) {
  const onSubmit = vi.fn(async (_action: typeof primaryAction) => {})
  const sendEmail = vi.fn(async (_outcome: AccountTakedownOutcome) => {})
  return {
    primaryAction,
    accountAction,
    recommendation,
    getAccountStatus: vi.fn(async () => status),
    getAccountTakedown: vi.fn(async () => ({
      $type: MOD_EVENTS.TAKEDOWN,
      targetServices: ['pds'],
    })),
    onSubmit,
    sendEmail,
  }
}

const duplicate = () =>
  new XRPCError(400, 'InvalidRequest', 'Subject is already taken down')

describe('record takedown submission', () => {
  it.each([{ takendown: true }])(
    'removes the record and sends email while preserving a permanent restriction: %j',
    async (status) => {
      const input = setup(status)
      await submitRecordTakedown(input)
      expect(input.onSubmit).toHaveBeenCalledOnce()
      expect(input.onSubmit).toHaveBeenCalledWith(primaryAction)
      expect(input.getAccountTakedown).not.toHaveBeenCalled()
      expect(input.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ accountRestrictionUnchanged: true }),
      )
    },
  )

  it('applies a new suspension before email, without duplicating record strikes', async () => {
    const input = setup()
    await submitRecordTakedown(input)
    expect(input.onSubmit).toHaveBeenNthCalledWith(1, primaryAction)
    expect(input.onSubmit).toHaveBeenNthCalledWith(2, {
      ...accountAction,
      event: { ...accountAction.event, durationInHours: 72 },
    })
    expect(input.onSubmit.mock.invocationCallOrder.at(-1)).toBeLessThan(
      input.sendEmail.mock.invocationCallOrder[0],
    )
    expect(input.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ accountRestrictionUnchanged: false }),
    )
  })

  it('rounds a configured partial-hour suspension up to a valid API duration', async () => {
    const input = setup()
    await submitRecordTakedown({
      ...input,
      recommendation: { ...recommendation, suspensionDurationInHours: 0.5 },
    })
    expect(input.onSubmit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ durationInHours: 1 }),
      }),
    )
  })

  it.each([false, true])(
    'replaces a temporary suspension with the recommended restriction (permanent: %s)',
    async (isPermanent) => {
      const input = setup(suspended(24))
      await submitRecordTakedown({
        ...input,
        recommendation: { ...recommendation, isPermanent },
      })
      expect(input.onSubmit).toHaveBeenCalledTimes(3)
      expect(input.onSubmit).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          subject: accountAction.subject,
          event: expect.objectContaining({
            $type: MOD_EVENTS.REVERSE_TAKEDOWN,
          }),
        }),
      )
      expect(input.onSubmit).toHaveBeenNthCalledWith(3, {
        ...accountAction,
        event: {
          ...accountAction.event,
          durationInHours: isPermanent ? undefined : 96,
          targetServices: ['pds', 'appview'],
        },
      })
      expect(input.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ accountRestrictionUnchanged: false }),
      )
    },
  )

  it('preserves all-service enforcement when the existing event omits target services', async () => {
    const input = setup(suspended(24))
    await submitRecordTakedown({
      ...input,
      getAccountTakedown: async () => ({ $type: MOD_EVENTS.TAKEDOWN }),
    })
    expect(input.onSubmit).toHaveBeenLastCalledWith({
      ...accountAction,
      event: {
        ...accountAction.event,
        durationInHours: 96,
        targetServices: undefined,
      },
    })
  })

  it('keeps the calculated expiry when the transition takes time', async () => {
    const input = setup(suspended(24))
    input.onSubmit.mockImplementation(async (action) => {
      if (action.event.$type === MOD_EVENTS.REVERSE_TAKEDOWN) {
        vi.setSystemTime(now + HOUR)
      }
    })
    await submitRecordTakedown(input)
    expect(input.onSubmit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ durationInHours: 95 }),
      }),
    )
  })

  it('reports the added period and the combined end date to the email callback', async () => {
    const input = setup(suspended(48))
    await submitRecordTakedown({
      ...input,
      recommendation: { ...recommendation, suspensionDurationInHours: 168 },
    })
    expect(input.onSubmit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ durationInHours: 216 }),
      }),
    )
    expect(input.sendEmail).toHaveBeenCalledWith({
      state: temporary(216),
      accountRestrictionUnchanged: false,
      suspensionExtended: true,
    })
  })

  it('uses the whole-hour API duration for the notification expiry', async () => {
    const input = setup(suspended(0.5))
    await submitRecordTakedown(input)
    expect(input.onSubmit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ durationInHours: 73 }),
      }),
    )
    expect(input.sendEmail).toHaveBeenCalledWith({
      state: temporary(73),
      accountRestrictionUnchanged: false,
      suspensionExtended: true,
    })
  })

  it('keeps the existing timer when another report stays in the same tier', async () => {
    const input = setup(suspended(48))
    await submitRecordTakedown({
      ...input,
      recommendation: { ...recommendation, thresholdCrossed: undefined },
    })
    expect(input.onSubmit).toHaveBeenCalledOnce()
    expect(input.sendEmail).toHaveBeenCalledWith({
      state: temporary(48),
      accountRestrictionUnchanged: true,
      suspensionExtended: false,
    })
  })

  it('sends a notification without changing the account when no account action is recommended', async () => {
    const input = setup(suspended(24))
    await submitRecordTakedown({ ...input, recommendation: null })
    expect(input.onSubmit).toHaveBeenCalledOnce()
    expect(input.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ accountRestrictionUnchanged: true }),
    )
  })

  it('keeps a stronger restriction applied concurrently after the first status check', async () => {
    const input = setup(suspended(24))
    input.getAccountStatus
      .mockResolvedValueOnce(suspended(24))
      .mockResolvedValue({ takendown: true })
    await submitRecordTakedown(input)
    expect(input.onSubmit).toHaveBeenCalledOnce()
    expect(input.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ accountRestrictionUnchanged: true }),
    )
  })

  it('does not reverse a changed restriction using stale service coverage', async () => {
    const input = setup(suspended(24))
    input.getAccountStatus
      .mockResolvedValueOnce(suspended(24))
      .mockResolvedValue(suspended(30))
    await expect(submitRecordTakedown(input)).rejects.toThrow(
      'Review the account before adjusting its restriction',
    )
    expect(input.onSubmit).toHaveBeenCalledOnce()
    expect(input.sendEmail).not.toHaveBeenCalled()
  })

  it('rechecks an already-taken-down conflict and preserves a concurrent permanent restriction', async () => {
    const input = setup()
    input.getAccountStatus
      .mockResolvedValueOnce({ takendown: false })
      .mockResolvedValue({ takendown: true })
    input.onSubmit
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(duplicate())
    await submitRecordTakedown(input)
    expect(input.onSubmit).toHaveBeenCalledTimes(2)
    expect(input.getAccountStatus).toHaveBeenCalledTimes(2)
    expect(input.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ accountRestrictionUnchanged: true }),
    )
  })

  it('recalculates after a conflict and upgrades a concurrent temporary restriction', async () => {
    const input = setup()
    input.getAccountStatus
      .mockResolvedValueOnce({ takendown: false })
      .mockResolvedValue(suspended(24))
    input.onSubmit
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(duplicate())
    await submitRecordTakedown(input)
    expect(input.onSubmit).toHaveBeenCalledTimes(4)
    expect(input.onSubmit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ durationInHours: 96 }),
      }),
    )
    expect(input.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ accountRestrictionUnchanged: false }),
    )
  })

  it('bounds retries for conflicting takedowns', async () => {
    const input = setup()
    input.onSubmit
      .mockResolvedValueOnce(undefined)
      .mockRejectedValue(duplicate())
    await expect(submitRecordTakedown(input)).rejects.toThrow(
      'already taken down',
    )
    expect(input.onSubmit).toHaveBeenCalledTimes(3)
    expect(input.sendEmail).not.toHaveBeenCalled()
  })

  it('does not add the period a second time after a replacement conflict', async () => {
    const input = setup(suspended(24))
    input.getAccountStatus
      .mockResolvedValueOnce(suspended(24))
      .mockResolvedValueOnce(suspended(24))
      .mockResolvedValue(suspended(96))
    input.onSubmit
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(duplicate())
    await submitRecordTakedown(input)
    expect(input.onSubmit).toHaveBeenCalledTimes(3)
    expect(input.sendEmail).toHaveBeenCalledWith({
      state: temporary(96),
      accountRestrictionUnchanged: true,
      suspensionExtended: false,
    })
  })

  it.each([suspended(48), { takendown: false }])(
    'surfaces a replacement conflict that does not cover the intended total: %j',
    async (current) => {
      const input = setup(suspended(24))
      input.getAccountStatus
        .mockResolvedValueOnce(suspended(24))
        .mockResolvedValueOnce(suspended(24))
        .mockResolvedValue(current)
      input.onSubmit
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(duplicate())
      await expect(submitRecordTakedown(input)).rejects.toThrow(
        'replacement could not be confirmed',
      )
      expect(input.onSubmit).toHaveBeenCalledTimes(3)
      expect(input.sendEmail).not.toHaveBeenCalled()
    },
  )

  it('stops before changing the record if the status check fails', async () => {
    const input = setup()
    const error = new Error('status unavailable')
    input.getAccountStatus.mockRejectedValueOnce(error)
    await expect(submitRecordTakedown(input)).rejects.toBe(error)
    expect(input.onSubmit).not.toHaveBeenCalled()
    expect(input.sendEmail).not.toHaveBeenCalled()
  })

  it('does not ignore a duplicate takedown error on the record itself', async () => {
    const input = setup()
    const error = duplicate()
    input.onSubmit.mockRejectedValueOnce(error)
    await expect(submitRecordTakedown(input)).rejects.toBe(error)
    expect(input.onSubmit).toHaveBeenCalledOnce()
    expect(input.sendEmail).not.toHaveBeenCalled()
  })

  it.each([
    new XRPCError(403, 'Forbidden', 'Not allowed'),
    new XRPCError(500, 'InternalServerError', 'Subject is already taken down'),
    new XRPCError(400, 'InvalidRequest', 'Invalid subject'),
    new Error('Subject is already taken down'),
  ])('preserves other account-action errors: %s', async (error) => {
    const input = setup()
    input.onSubmit.mockResolvedValueOnce(undefined).mockRejectedValueOnce(error)
    await expect(submitRecordTakedown(input)).rejects.toBe(error)
    expect(input.sendEmail).not.toHaveBeenCalled()
  })

  it('reports a partial failure if replacement fails after reversal and does not email', async () => {
    const input = setup(suspended(24))
    input.onSubmit
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('unavailable'))
    await expect(submitRecordTakedown(input)).rejects.toThrow(
      'previous account restriction was reversed',
    )
    expect(input.sendEmail).not.toHaveBeenCalled()
  })

  it('surfaces email failures without repeating the moderation actions', async () => {
    const input = setup({ takendown: true })
    const error = new Error('email failed')
    input.sendEmail.mockRejectedValueOnce(error)
    await expect(submitRecordTakedown(input)).rejects.toBe(error)
    expect(input.onSubmit).toHaveBeenCalledOnce()
    expect(input.sendEmail).toHaveBeenCalledOnce()
  })
})
