import { parseModToolRegistry } from '@/reports/modToolRegistry'

export const OAUTH_SCOPE = 'atproto transition:generic transition:chat.bsky'

export const OZONE_SERVICE_DID =
  process.env.NEXT_PUBLIC_OZONE_SERVICE_DID || undefined

export const OZONE_PUBLIC_URL =
  process.env.NEXT_PUBLIC_OZONE_PUBLIC_URL || undefined

export const PLC_DIRECTORY_URL =
  process.env.NEXT_PUBLIC_PLC_DIRECTORY_URL ||
  (process.env.NODE_ENV === 'development'
    ? 'http://localhost:2582'
    : 'https://plc.directory')

export const QUEUE_CONFIG = process.env.NEXT_PUBLIC_QUEUE_CONFIG || '{}'

export const QUEUE_SEED = process.env.NEXT_PUBLIC_QUEUE_SEED || ''

export const SOCIAL_APP_URL =
  process.env.NEXT_PUBLIC_SOCIAL_APP_URL ||
  (process.env.NODE_ENV === 'development'
    ? 'http://localhost:2584'
    : 'https://bsky.app')

export const HANDLE_RESOLVER_URL =
  process.env.NEXT_PUBLIC_HANDLE_RESOLVER_URL ||
  (process.env.NODE_ENV === 'development'
    ? 'http://localhost:2584'
    : 'https://api.bsky.app')

export const DM_DISABLE_TAG = 'chat-disabled'
export const VIDEO_UPLOAD_DISABLE_TAG = 'video-upload-disabled'
export const TRUSTED_VERIFIER_TAG = 'trusted-verifier'

export const STARTER_PACK_OG_CARD_URL = `https://ogcard.cdn.bsky.app/start`

export const IMAGE_SEARCH_API_URL = process.env.NEXT_PUBLIC_IMAGE_SEARCH_API_URL

type SubjectAgeWarningSettings = {
  thresholdDays?: number
  severityLevel?: string
}

type SubjectAgeWarningConfig = {
  record: SubjectAgeWarningSettings
  includedPolicies: string[]
}

const parseIncludedPolicies = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []

  return [
    ...new Set(
      value
        .filter((policy): policy is string => typeof policy === 'string')
        .map((policy) => policy.trim())
        .filter(Boolean),
    ),
  ]
}

const parseSubjectAgeWarningSettings = (
  value: unknown,
): SubjectAgeWarningSettings => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {}
  }

  const settings = value as Record<string, unknown>
  const thresholdDays = settings.thresholdDays
  const severityLevel =
    typeof settings.severityLevel === 'string'
      ? settings.severityLevel.trim() || undefined
      : undefined

  return {
    ...(typeof thresholdDays === 'number' &&
      Number.isSafeInteger(thresholdDays) &&
      thresholdDays > 0 && { thresholdDays }),
    ...(severityLevel && { severityLevel }),
  }
}

const parseSubjectAgeWarningConfig = (
  value: string | undefined,
): SubjectAgeWarningConfig => {
  const emptyConfig = { record: {}, includedPolicies: [] }
  if (!value?.trim()) return emptyConfig

  try {
    const config: unknown = JSON.parse(value)
    if (
      typeof config !== 'object' ||
      config === null ||
      Array.isArray(config)
    ) {
      return emptyConfig
    }

    const settings = config as Record<string, unknown>
    return {
      record: parseSubjectAgeWarningSettings(settings.record),
      includedPolicies: parseIncludedPolicies(settings.includedPolicies),
    }
  } catch {
    return emptyConfig
  }
}

const SUBJECT_AGE_WARNING_CONFIG = parseSubjectAgeWarningConfig(
  process.env.NEXT_PUBLIC_SUBJECT_AGE_WARNING_CONFIG,
)

export const RECORD_AGE_THRESHOLD_DAYS =
  SUBJECT_AGE_WARNING_CONFIG.record.thresholdDays

export const RECORD_AGE_SEVERITY_LEVEL =
  SUBJECT_AGE_WARNING_CONFIG.record.severityLevel

export const SUBJECT_AGE_WARNING_INCLUDED_POLICIES =
  SUBJECT_AGE_WARNING_CONFIG.includedPolicies

export const IMAGE_SEARCH_DEFAULT_LOOKBACK_DAYS = process.env
  .NEXT_PUBLIC_IMAGE_SEARCH_DEFAULT_LOOKBACK_DAYS
  ? parseInt(process.env.NEXT_PUBLIC_IMAGE_SEARCH_DEFAULT_LOOKBACK_DAYS)
  : 14

export const NEW_ACCOUNT_MARKER_THRESHOLD_IN_DAYS = process.env
  .NEXT_PUBLIC_NEW_ACCOUNT_MARKER_THRESHOLD_IN_DAYS
  ? parseInt(process.env.NEXT_PUBLIC_NEW_ACCOUNT_MARKER_THRESHOLD_IN_DAYS)
  : 7

export const YOUNG_ACCOUNT_MARKER_THRESHOLD_IN_DAYS = process.env
  .NEXT_PUBLIC_YOUNG_ACCOUNT_MARKER_THRESHOLD_IN_DAYS
  ? parseInt(process.env.NEXT_PUBLIC_YOUNG_ACCOUNT_MARKER_THRESHOLD_IN_DAYS)
  : 30

export const DOMAINS_ALLOWING_EMAIL_COMMUNICATION = (
  process.env.NEXT_PUBLIC_DOMAINS_ALLOWING_EMAIL_COMMUNICATION || ''
).split(',')

export const HIGH_PROFILE_FOLLOWER_THRESHOLD = process.env
  .NEXT_PUBLIC_HIGH_PROFILE_FOLLOWER_THRESHOLD
  ? parseInt(process.env.NEXT_PUBLIC_HIGH_PROFILE_FOLLOWER_THRESHOLD)
  : Infinity

export const FALLBACK_VIDEO_URL = (
  process.env.NEXT_PUBLIC_FALLBACK_VIDEO_URL || ''
).split(':')

// strike to account suspension duration mapping (in hours)
// format: "strikeCount:durationInHours" pairs, separated by commas
// use "Infinity" for permanent suspension
const parseStrikeSuspensionConfig = (
  config: string,
): Record<number, number> => {
  const pairs = config.split(',').map((pair) => pair.trim())
  const result: Record<number, number> = {}

  if (!pairs.length) {
    return result
  }

  for (const pair of pairs) {
    const [strikeStr, durationStr] = pair.split(':').map((s) => s.trim())
    if (strikeStr && durationStr) {
      const strikeCount = parseInt(strikeStr)
      const duration =
        durationStr === 'Infinity' ? Infinity : parseFloat(durationStr)
      if (!isNaN(strikeCount) && !isNaN(duration)) {
        result[strikeCount] = duration
      }
    }
  }

  return result
}

export const STRIKE_TO_SUSPENSION_DURATION_IN_HOURS =
  parseStrikeSuspensionConfig(
    process.env.NEXT_PUBLIC_STRIKE_SUSPENSION_CONFIG || '',
  )

export const AUTOMATED_ACTION_EMAIL_IDS = {
  strike: process.env.NEXT_PUBLIC_STRIKE_EMAIL_TEMPLATE_ID,
}

// Display config for reports created by external intake tools (keyed by
// modTool.name). See components/reports/modToolRegistry.ts.
export const MOD_TOOL_REGISTRY = parseModToolRegistry(
  process.env.NEXT_PUBLIC_MOD_TOOL_REGISTRY,
)
