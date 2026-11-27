import type { ToolsOzoneModerationEmitEvent } from '@atproto/api'
import { MOD_EVENTS } from '../constants'
import { nameToKey } from '../../setting/policy/utils'
import type { SeverityLevelListSetting } from '@/setting/severity-level/types'

type Event = ToolsOzoneModerationEmitEvent.InputSchema['event']
const DAY = 86_400_000
export type StrikeEventInput = Pick<
  ToolsOzoneModerationEmitEvent.InputSchema,
  'event' | 'modTool'
>

export function needsStrikeExpiry(
  event: Event,
): event is Event & { strikeCount: number; severityLevel: string } {
  return (
    [MOD_EVENTS.TAKEDOWN, MOD_EVENTS.REVERSE_TAKEDOWN, MOD_EVENTS.EMAIL].some(
      (type) => type === event.$type,
    ) &&
    'strikeCount' in event &&
    typeof event.strikeCount === 'number' &&
    event.strikeCount !== 0 &&
    'severityLevel' in event &&
    typeof event.severityLevel === 'string' &&
    !!event.severityLevel &&
    (!('strikeExpiresAt' in event) || event.strikeExpiresAt === undefined)
  )
}

export function withStrikeExpiry(
  input: StrikeEventInput,
  levels?: SeverityLevelListSetting | null,
  eventTime = Date.now(),
): StrikeEventInput {
  const { event } = input
  if (!needsStrikeExpiry(event)) return input
  const days = levels?.[nameToKey(event.severityLevel)]?.expiryInDays
  if (days === undefined || days === 0) return input
  const expiry = new Date(eventTime + days * DAY)
  if (
    !Number.isSafeInteger(days) ||
    days < 0 ||
    !Number.isFinite(expiry.getTime()) ||
    expiry.getUTCFullYear() > 9999
  ) {
    throw new Error('Invalid strike expiry duration')
  }
  const expiringEvent = { ...event, strikeExpiresAt: expiry.toISOString() }
  return {
    ...input,
    event: expiringEvent,
    modTool: {
      name: 'ozone-ui',
      ...input.modTool,
      meta: { ...input.modTool?.meta, strikeExpiryDays: days },
    },
  }
}
