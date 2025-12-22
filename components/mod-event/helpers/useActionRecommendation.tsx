import { useQuery } from '@tanstack/react-query'
import { STRIKE_TO_SUSPENSION_DURATION_IN_HOURS } from '@/lib/constants'
import { HOUR, DAY, pluralize, getDidFromUri } from '@/lib/util'
import {
  Agent,
  AtUri,
  ComAtprotoAdminDefs,
  ComAtprotoRepoStrongRef,
  ToolsOzoneModerationDefs,
} from '@atproto/api'
import {
  SeverityLevelDetail,
  SeverityLevelListSetting,
} from '@/setting/severity-level/types'
import { nameToKey } from '@/setting/policy/utils'

// We're modelling this after the ToolsOzoneModerationDefs.AccountStrike and rebuilding that data because
// when only records by a user has been reviewed but never the account, the account never gets a status
// so the status data comes back empty which isn't true for strikes
type StrikeData = ToolsOzoneModerationDefs.AccountStrike & {
  events: ToolsOzoneModerationDefs.ModEventView[]
  lastReverseTakedownEvent?: ToolsOzoneModerationDefs.ModEventView
  lastAccountTakedownEvent?: ToolsOzoneModerationDefs.ModEventView
  lastAccountSuspensionEvent?: ToolsOzoneModerationDefs.ModEventView
  wasLastTakedownReverted?: boolean
  wasLastSuspensionReverted?: boolean
}

export type ActionRecommendation = {
  totalStrikes: number
  recommendedDuration: number
  isPermanent: boolean
  suspensionDurationInHours: number | null
  message: string
  actualStrikesToApply: number
  needsReverseTakedown?: boolean
  adjustedTakedownDurationInHours?: number
  strikeData?: StrikeData
}

const getStrikeEvents = async (labelerAgent: Agent, did: string) => {
  let cursor: string | undefined = undefined
  const events: ToolsOzoneModerationDefs.ModEventView[] = []

  do {
    const { data } = await labelerAgent.tools.ozone.moderation.queryEvents({
      subject: did,
      includeAllUserRecords: true,
      limit: 100,
      cursor,
      withStrike: true,
    })
    events.push(...data.events)
    cursor = data.cursor
  } while (cursor)

  return events
}

const formatDurationInHours = (durationInHours: number): string => {
  if (durationInHours === Infinity) return 'permanent'
  const days = (durationInHours * HOUR) / DAY
  if (days >= 1) {
    return pluralize(days, 'day')
  }
  return pluralize(durationInHours, 'hour')
}

const useStrikeEvents = (
  labelerAgent: Agent,
  subject: string,
  severityLevelSettings?: SeverityLevelListSetting | null,
) => {
  return useQuery({
    queryKey: ['strikeEvents', subject, severityLevelSettings],
    queryFn: async () => {
      let lastAccountSuspensionEvent:
        | ToolsOzoneModerationDefs.ModEventView
        | undefined

      let lastAccountTakedownEvent:
        | ToolsOzoneModerationDefs.ModEventView
        | undefined

      let lastReverseTakedownEvent:
        | ToolsOzoneModerationDefs.ModEventView
        | undefined

      if (!subject) {
        return {
          totalStrikeCount: 0,
          activeStrikeCount: 0,
          events: [],
          lastReverseTakedownEvent: undefined,
          lastAccountSuspensionEvent: undefined,
          wasLastSuspensionReverted: false,
        }
      }

      const did = subject.startsWith('did:') ? subject : getDidFromUri(subject)
      const strikeEvents = await getStrikeEvents(labelerAgent, did)

      const now = new Date()
      let totalStrikeCount = 0
      let activeStrikeCount = 0

      for (const event of strikeEvents) {
        // Events are already sorted in reverse chronological order
        // so once we find the first suspension/reversal event, that means it's the latest suspension event in the stream
        if (
          ToolsOzoneModerationDefs.isModEventTakedown(event.event) &&
          event.subject.$type === 'com.atproto.admin.defs#repoRef'
        ) {
          if (!!event.event.durationInHours && !lastAccountSuspensionEvent) {
            lastAccountSuspensionEvent = event
          }
          if (!lastAccountTakedownEvent) {
            lastAccountTakedownEvent = event
          }
        }

        if (
          ToolsOzoneModerationDefs.isModEventReverseTakedown(event.event) &&
          event.subject.$type === 'com.atproto.admin.defs#repoRef' &&
          !lastReverseTakedownEvent
        ) {
          lastReverseTakedownEvent = event
        }

        if (!('strikeCount' in event.event) || !event.event.strikeCount) {
          continue
        }
        // Check if this strike has expired
        const eventDate = new Date(event.createdAt)
        let isExpired = false

        // If the event has a severity level, check its expiry
        if (event.event.severityLevel && severityLevelSettings) {
          const severityLevelKey = nameToKey(event.event.severityLevel)
          const severityLevel = severityLevelSettings[severityLevelKey]

          if (severityLevel?.expiryInDays) {
            const expiryDate = new Date(eventDate)
            expiryDate.setDate(
              expiryDate.getDate() + severityLevel.expiryInDays,
            )
            isExpired = now > expiryDate
          }
        }

        // Only count strikes that haven't expired
        if (!isExpired) {
          activeStrikeCount += event.event.strikeCount
        } else {
          totalStrikeCount += event.event.strikeCount
        }
      }

      return {
        totalStrikeCount,
        activeStrikeCount,
        events: strikeEvents,
        lastReverseTakedownEvent,
        lastAccountTakedownEvent,
        lastAccountSuspensionEvent,
        firstStrikeAt: strikeEvents[0]?.createdAt,
        lastStrikeAt: strikeEvents[strikeEvents.length - 1]?.createdAt,
        wasLastTakedownReverted:
          lastAccountTakedownEvent && lastReverseTakedownEvent
            ? new Date(lastReverseTakedownEvent.createdAt) >
              new Date(lastAccountTakedownEvent.createdAt)
            : false,
        wasLastSuspensionReverted:
          lastAccountSuspensionEvent && lastReverseTakedownEvent
            ? new Date(lastReverseTakedownEvent.createdAt) >
              new Date(lastAccountSuspensionEvent.createdAt)
            : false,
      }
    },
    enabled: !!subject,
  })
}

export const useActionRecommendation = (
  labelerAgent: Agent,
  subject: string,
  severityLevelSettings?: SeverityLevelListSetting | null,
) => {
  const isSubjectDid = subject.startsWith('did:')
  const {
    isLoading,
    data: strikeData,
    error: strikeDataError,
  } = useStrikeEvents(labelerAgent, subject, severityLevelSettings)

  const getRecommendedAction = (
    strikeCount: number | null,
    severityLevelData?: SeverityLevelDetail,
    policyName?: string,
    // when reverting takedowns
    isNegative: boolean = false,
  ): ActionRecommendation | null => {
    const currentStrikes = strikeData?.activeStrikeCount || 0

    // Handle negative strikes (for RESOLVE_APPEAL)
    if (isNegative) {
      if (strikeCount === null) {
        return {
          totalStrikes: currentStrikes,
          recommendedDuration: 0,
          isPermanent: false,
          suspensionDurationInHours: null,
          actualStrikesToApply: 0,
          needsReverseTakedown: true,
          message: `Account will be reinstated without strike adjustment`,
        }
      }
      const negativeStrikeCount = -Math.abs(
        severityLevelData?.firstOccurrenceStrikeCount
          ? severityLevelData.firstOccurrenceStrikeCount
          : strikeCount,
      )
      const newTotalStrikes = Math.max(0, currentStrikes + negativeStrikeCount)

      // Find current suspension threshold
      const sortedThresholds = Object.keys(
        STRIKE_TO_SUSPENSION_DURATION_IN_HOURS,
      )
        .map(Number)
        .sort((a, b) => a - b)

      let currentThreshold: number | null = null
      let newThreshold: number | null = null

      for (const threshold of sortedThresholds) {
        if (currentStrikes >= threshold) {
          currentThreshold = threshold
        }
        if (newTotalStrikes >= threshold) {
          newThreshold = threshold
        }
      }

      const currentDuration =
        currentThreshold !== null
          ? STRIKE_TO_SUSPENSION_DURATION_IN_HOURS[currentThreshold]
          : 0
      const newDuration =
        newThreshold !== null
          ? STRIKE_TO_SUSPENSION_DURATION_IN_HOURS[newThreshold]
          : 0

      let needsReverseTakedown = false
      let adjustedTakedownDurationInHours: number | undefined

      // If we're crossing suspension thresholds (going down or being completely reverted)
      if (
        currentThreshold !== null &&
        (newThreshold === null || currentThreshold !== newThreshold)
      ) {
        needsReverseTakedown = true

        // If we still have a suspension threshold after the appeal (but lower tier)
        if (newThreshold !== null && newDuration !== Infinity) {
          const newDurationInHours = newDuration / HOUR

          // Calculate time already served if we have a recent takedown event
          if (
            !strikeData?.wasLastSuspensionReverted &&
            strikeData?.lastAccountSuspensionEvent?.event &&
            ToolsOzoneModerationDefs.isModEventTakedown(
              strikeData.lastAccountSuspensionEvent.event,
            )
          ) {
            const takedownDate = new Date(
              strikeData.lastAccountSuspensionEvent.createdAt,
            )
            const now = new Date()
            const hoursServed = (now.getTime() - takedownDate.getTime()) / HOUR

            // Adjusted duration = new tier duration - time already served
            const adjusted = Math.max(0, newDurationInHours - hoursServed)
            adjustedTakedownDurationInHours = Math.round(adjusted * 100) / 100 // Round to 2 decimal places
          } else {
            // No recent takedown event found, use full new duration
            adjustedTakedownDurationInHours = newDurationInHours
          }
        }
      }

      const displayStrike = pluralize(Math.abs(negativeStrikeCount), 'strike')
      let message: string
      if (currentStrikes === 0) {
        message = `No strikes to subtract (user has 0 strikes)`
      } else if (currentThreshold !== null && newThreshold === null) {
        message = `${displayStrike} will be subtracted (${currentStrikes} → ${newTotalStrikes}) - Suspension will be REVERTED`
      } else if (
        currentThreshold !== null &&
        newThreshold !== null &&
        currentThreshold !== newThreshold
      ) {
        const adjustedInfo =
          adjustedTakedownDurationInHours !== undefined
            ? ` (adjusted: ${adjustedTakedownDurationInHours}h after time served)`
            : ''
        message = `${displayStrike} will be subtracted (${currentStrikes} → ${newTotalStrikes}) - Suspension will be reduced from ${formatDurationInHours(
          currentDuration,
        )} to ${formatDurationInHours(newDuration)}${adjustedInfo}`
      } else if (
        currentThreshold !== null &&
        newThreshold === currentThreshold
      ) {
        message = `${displayStrike} will be subtracted (${currentStrikes} → ${newTotalStrikes}) - Suspension remains ${formatDurationInHours(
          currentDuration,
        )}`
      } else {
        message = `${displayStrike} will be subtracted (${currentStrikes} → ${newTotalStrikes})`
      }

      return {
        totalStrikes: newTotalStrikes,
        recommendedDuration: newDuration === Infinity ? 0 : newDuration,
        isPermanent: newDuration === Infinity,
        suspensionDurationInHours:
          newDuration === Infinity
            ? null
            : newDuration === 0
            ? null
            : newDuration / HOUR,
        actualStrikesToApply: negativeStrikeCount,
        message,
        needsReverseTakedown,
        adjustedTakedownDurationInHours,
        strikeData,
      }
    }

    // If severity level requires immediate takedown, return permanent takedown
    if (severityLevelData?.needsTakedown) {
      return {
        totalStrikes: currentStrikes,
        recommendedDuration: 0,
        isPermanent: true,
        suspensionDurationInHours: null,
        actualStrikesToApply: 0, // No strikes needed for immediate ban
        message: `${currentStrikes} previous strikes but account will be permanently taken down because severity level requires takedown`,
      }
    }

    // Count previous occurrences of same policy + severity level
    // TODO: We probably need to account for reverted actions here
    let previousOccurrences = 0
    if (policyName && severityLevelData?.name) {
      previousOccurrences = (strikeData?.events || []).filter((event) => {
        const isSameEvent =
          (ToolsOzoneModerationDefs.isModEventTakedown(event.event) ||
            ToolsOzoneModerationDefs.isModEventEmail(event.event)) &&
          event.event.policies?.includes(policyName)
        return isSameEvent
      }).length
    }

    // Check if this is the first occurrence and if firstOccurrenceStrikeCount is set
    let actualStrikesToApply = strikeCount || 0
    const isFirstOccurrence = previousOccurrences === 0
    let willApplyStrikesOnFutureOccurrence = true

    if (
      isFirstOccurrence &&
      severityLevelData?.firstOccurrenceStrikeCount !== undefined
    ) {
      // Use firstOccurrenceStrikeCount for the first occurrence
      actualStrikesToApply = severityLevelData.firstOccurrenceStrikeCount
    } else if (
      severityLevelData?.strikeOnOccurrence &&
      severityLevelData.strikeOnOccurrence > 1
    ) {
      // Check strikeOnOccurrence logic for subsequent occurrences
      // Only apply strikes if we've reached the occurrence threshold
      // For example, if strikeOnOccurrence is 2, we need at least 1 previous occurrence
      if (previousOccurrences < severityLevelData.strikeOnOccurrence - 1) {
        actualStrikesToApply = 0
        willApplyStrikesOnFutureOccurrence = true
      }
    }

    const totalStrikes = currentStrikes + actualStrikesToApply

    // Find the matching threshold in STRIKE_TO_SUSPENSION_DURATION_IN_HOURS
    // The mapping keys are thresholds that trigger specific durations
    const sortedThresholds = Object.keys(STRIKE_TO_SUSPENSION_DURATION_IN_HOURS)
      .map(Number)
      .sort((a, b) => a - b)

    let recommendedDuration = 0
    let isPermanent = false
    let matchedThreshold: number | null = null

    for (const threshold of sortedThresholds) {
      if (totalStrikes >= threshold) {
        matchedThreshold = threshold
        const duration = STRIKE_TO_SUSPENSION_DURATION_IN_HOURS[threshold]
        isPermanent = duration === Infinity
        recommendedDuration = isPermanent ? 0 : duration
      }
    }

    let message: string
    const displayStrike = pluralize(totalStrikes, 'total strike')
    if (matchedThreshold === null) {
      if (willApplyStrikesOnFutureOccurrence && !actualStrikesToApply) {
        let futureStrikes = severityLevelData?.strikeCount
          ? `${pluralize(
              severityLevelData.strikeCount,
              'strike',
            )} will be added`
          : ''
        if (severityLevelData?.strikeOnOccurrence && futureStrikes) {
          futureStrikes += ` after ${pluralize(
            severityLevelData.strikeOnOccurrence,
            'violation',
          )}`
        }
        message = futureStrikes
          ? `${displayStrike} - ${futureStrikes}`
          : displayStrike
      } else {
        message = `${displayStrike} - No suspension recommended`
      }
      return {
        message,
        totalStrikes,
        recommendedDuration: 0,
        isPermanent: false,
        suspensionDurationInHours: null,
        actualStrikesToApply,
        strikeData,
      }
    }

    if (actualStrikesToApply === 0 && strikeCount && strikeCount > 0) {
      // Strikes configured but not applied due to strikeOnOccurrence
      message = `${displayStrike} (no strikes added - occurrence threshold not met)`
    } else if (isPermanent) {
      message = `${displayStrike} - Account will be permanently taken down`
    } else if (matchedThreshold !== null) {
      message = `${displayStrike} - Account will be suspended for ${formatDurationInHours(
        recommendedDuration,
      )}`
    } else {
      message = `${displayStrike} - No suspension recommended`
    }

    const suspensionDurationInHours = isPermanent ? null : recommendedDuration

    return {
      totalStrikes,
      recommendedDuration,
      isPermanent,
      suspensionDurationInHours,
      actualStrikesToApply,
      message,
      strikeData,
    }
  }

  // Get the most recent TAKEDOWN/suspension event with policy/severity level for auto-selection
  const getLastContentTakedownDetails = () => {
    if (!strikeData?.events?.length) {
      return null
    }

    // Find the most recent event with policy and severity level for current subject
    const lastEventWithPolicyDetails = strikeData.events.find((event) => {
      // Only consider account events for DID subjects and record events for at-uri subjects
      if (
        !ToolsOzoneModerationDefs.isModEventTakedown(event.event) ||
        (!isSubjectDid && ComAtprotoAdminDefs.isRepoRef(event.subject)) ||
        (isSubjectDid && ComAtprotoRepoStrongRef.isMain(event.subject))
      ) {
        return false
      }

      // Since we fetch ALL events across all subjects for the DID, we want to filter out
      // events that are not for the current subject
      if (
        ComAtprotoRepoStrongRef.isMain(event.subject) &&
        event.subject.uri !== subject
      ) {
        return false
      }

      return true
    })

    if (!lastEventWithPolicyDetails) {
      return null
    }

    const event = lastEventWithPolicyDetails.event
    // this is just for type narrowing
    if (!ToolsOzoneModerationDefs.isModEventTakedown(event)) {
      return null
    }

    return {
      policy: event.policies?.[0],
      strikeCount: event.strikeCount,
      severityLevel: event.severityLevel,
    }
  }

  return {
    isLoading,
    strikeData,
    strikeDataError,
    getRecommendedAction,
    getLastContentTakedownDetails,
    currentStrikes: strikeData?.totalStrikeCount || 0,
  }
}
