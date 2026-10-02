import {
  ToolsOzoneModerationDefs,
  type ToolsOzoneModerationEmitEvent,
} from '@atproto/api'
import { ResponseType, XRPCError } from '@atproto/xrpc'
import { hoursToMilliseconds } from 'date-fns'
import { MOD_EVENTS } from '../constants'
import type { ActionRecommendation } from './useActionRecommendation'

type ModerationAction = ToolsOzoneModerationEmitEvent.InputSchema
export type AccountTakedownStatus = Pick<
  ToolsOzoneModerationDefs.SubjectStatusView,
  'takendown' | 'suspendUntil'
>
export type TakedownState =
  | { type: 'none' }
  | { type: 'permanent' }
  | { type: 'temporary'; expiresAt: number }

export type AccountTakedownOutcome = {
  state: TakedownState
  accountRestrictionUnchanged: boolean
  suspensionExtended: boolean
}

type TakedownRecommendation = Pick<
  ActionRecommendation,
  'isPermanent' | 'thresholdCrossed' | 'suspensionDurationInHours'
>

export function getAccountTakedownState(
  status?: AccountTakedownStatus,
): TakedownState {
  if (!status?.takendown) return { type: 'none' }
  return status.suspendUntil
    ? { type: 'temporary', expiresAt: Date.parse(status.suspendUntil) }
    : { type: 'permanent' }
}

export function sameTakedownState(a: TakedownState, b: TakedownState) {
  return (
    a.type === b.type &&
    (a.type !== 'temporary' ||
      (b.type === 'temporary' && a.expiresAt === b.expiresAt))
  )
}

export function getAccountTakedownOutcome(
  current: TakedownState,
  next: TakedownState,
  now = Date.now(),
): AccountTakedownOutcome {
  return {
    state: next,
    accountRestrictionUnchanged:
      current.type !== 'none' && sameTakedownState(current, next),
    suspensionExtended:
      current.type === 'temporary' &&
      current.expiresAt > now &&
      next.type === 'temporary' &&
      next.expiresAt > current.expiresAt,
  }
}

export function getNextAccountTakedownState(
  current: TakedownState,
  recommendation: TakedownRecommendation | null,
  now = Date.now(),
): TakedownState {
  if (!recommendation) return current

  // A new violation must not shorten or remove an existing restriction.
  if (current.type === 'permanent') return current
  if (recommendation.isPermanent) return { type: 'permanent' }
  if (
    !recommendation.thresholdCrossed ||
    !recommendation.suspensionDurationInHours
  ) {
    return current
  }
  // The existing recommendation supplies the newly triggered period. Preserve
  // any unserved time by appending that period to the current suspension.
  const startsAt =
    current.type === 'temporary' ? Math.max(now, current.expiresAt) : now
  const expiresAt =
    startsAt + recommendation.suspensionDurationInHours * hoursToMilliseconds(1)
  return { type: 'temporary', expiresAt }
}

function isTakedownConflict(error: unknown) {
  return (
    error instanceof XRPCError &&
    error.status === ResponseType.InvalidRequest &&
    error.error === 'InvalidRequest' &&
    (error.message === 'Subject is already taken down' ||
      error.message === 'Subject is not taken down')
  )
}

function mergeTargetServices(existing?: string[], requested?: string[]) {
  // An omitted or empty list means all configured services.
  if (!existing?.length || !requested?.length) return undefined
  return [...new Set([...existing, ...requested])]
}

/**
 * Submits a takedown for a record and updates the associated account
 * only when its recommended takedown state differs from its current state.
 */
export async function submitRecordTakedown({
  primaryAction,
  accountAction,
  recommendation,
  getAccountStatus,
  getAccountTakedown,
  onSubmit,
  sendEmail,
}: {
  primaryAction: ModerationAction
  accountAction: ModerationAction
  recommendation: TakedownRecommendation | null
  getAccountStatus: () => Promise<AccountTakedownStatus | undefined>
  getAccountTakedown: () => Promise<
    ToolsOzoneModerationDefs.ModEventTakedown | undefined
  >
  onSubmit: (action: ModerationAction) => Promise<void>
  sendEmail: (outcome: AccountTakedownOutcome) => Promise<void>
}) {
  if (!ToolsOzoneModerationDefs.isModEventTakedown(accountAction.event)) {
    throw new Error('Expected an account takedown event')
  }

  let current = getAccountTakedownState(await getAccountStatus())
  // Fix the target expiry before submission so retries cannot extend it.
  const now = Date.now()
  await onSubmit(primaryAction)

  let reversed = false
  let outcome = getAccountTakedownOutcome(current, current)
  for (let attempt = 0; ; attempt++) {
    let next = getNextAccountTakedownState(current, recommendation, now)
    if (sameTakedownState(current, next)) {
      outcome = getAccountTakedownOutcome(current, current)
      break
    }

    let targetServices = accountAction.event.targetServices
    if (current.type !== 'none') {
      const previousEvent = await getAccountTakedown()
      // Re-check status before removing an active restriction.
      const latest = getAccountTakedownState(await getAccountStatus())
      const statusChanged = !sameTakedownState(current, latest)
      current = latest
      next = getNextAccountTakedownState(current, recommendation, now)
      if (sameTakedownState(current, next)) {
        outcome = getAccountTakedownOutcome(current, current)
        break
      }
      if (statusChanged) {
        // The event's service coverage may no longer describe this restriction.
        throw new Error(
          'The content action completed, but the account restriction changed. Review the account before adjusting its restriction.',
        )
      }
      targetServices = mergeTargetServices(
        previousEvent?.targetServices,
        targetServices,
      )
    }

    try {
      if (current.type !== 'none') {
        // First remove the current restriction before applying the new state.
        await onSubmit({
          subject: accountAction.subject,
          createdBy: accountAction.createdBy,
          event: {
            $type: MOD_EVENTS.REVERSE_TAKEDOWN,
            comment:
              'Updating account restriction for the recommended takedown',
          },
        })
        reversed = true
      }

      let applied = next
      if (next.type !== 'none') {
        const appliedAt = Date.now()
        const durationInHours =
          next.type === 'temporary'
            ? Math.ceil(
                Math.max(0, next.expiresAt - appliedAt) /
                  hoursToMilliseconds(1),
              )
            : undefined
        // A temporary restriction may have elapsed while requests were pending.
        if (durationInHours !== 0) {
          await onSubmit({
            ...accountAction,
            event: {
              ...accountAction.event,
              // Only set durationInHours for suspensions, not permanent takedowns.
              durationInHours,
              targetServices,
            },
          })
          // Reflect the whole-hour duration accepted by the API in the notice.
          if (durationInHours !== undefined) {
            applied = {
              type: 'temporary',
              expiresAt: appliedAt + durationInHours * hoursToMilliseconds(1),
            }
          }
        } else {
          applied = { type: 'none' }
        }
      }
      outcome = getAccountTakedownOutcome(current, applied, now)
      break
    } catch (error) {
      if (isTakedownConflict(error) && attempt < 1) {
        // Re-check status and compare again if another action won the race.
        current = getAccountTakedownState(await getAccountStatus())
        if (reversed) {
          // Never add the period again after a replacement was attempted.
          // A concurrent restriction may already cover the intended expiry.
          if (
            current.type === 'permanent' ||
            (current.type === 'temporary' &&
              next.type === 'temporary' &&
              current.expiresAt >= next.expiresAt)
          ) {
            outcome = getAccountTakedownOutcome(current, current)
            break
          }
        } else {
          continue
        }
      }
      if (reversed) {
        throw new Error(
          `The content action completed and the previous account restriction was reversed, but the replacement could not be confirmed. Review the account restriction before sending a notification. ${error instanceof Error ? error.message : ''}`,
        )
      }
      throw error
    }
  }

  await sendEmail(outcome)
}
