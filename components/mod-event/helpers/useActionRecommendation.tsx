import { useQuery } from '@tanstack/react-query'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { STRIKE_TO_SUSPENSION_DURATION_IN_HOURS } from '@/lib/constants'
import { HOUR, DAY, pluralize } from '@/lib/util'
import { Agent, AtUri, ToolsOzoneModerationDefs } from '@atproto/api'
import { useSeverityLevelSetting } from '@/setting/severity-level/useSeverityLevel'
import { SeverityLevelDetail } from '@/setting/severity-level/types'
import { nameToKey } from '@/setting/policy/utils'

type ActionRecommendation = {
  totalStrikes: number
  recommendedDuration: number
  isPermanent: boolean
  suspensionDurationInHours: number | null
  message: string
  actualStrikesToApply: number
  needsReverseTakedown?: boolean
  adjustedTakedownDurationInHours?: number
  lastTakedownEvent?: {
    createdAt: string
    durationInHours?: number
  }
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

const getAccountTakedownEvents = async (labelerAgent: Agent, did: string) => {
  let cursor: string | undefined = undefined
  const events: ToolsOzoneModerationDefs.ModEventView[] = []

  do {
    const { data } = await labelerAgent.tools.ozone.moderation.queryEvents({
      subject: did,
      types: ['tools.ozone.moderation.defs#modEventTakedown'],
      limit: 100,
      cursor,
    })
    events.push(...data.events)
    cursor = data.cursor
  } while (cursor)

  return events
}

export const useActionRecommendation = (subject: string) => {
  const labelerAgent = useLabelerAgent()
  const { data: severityLevelSettings } = useSeverityLevelSetting()

  const { data: strikeData, isLoading } = useQuery({
    queryKey: ['strikeEvents', subject, severityLevelSettings],
    queryFn: async () => {
      if (!subject) {
        return { totalStrikes: 0, events: [], takedownEvents: [] }
      }

      const did = subject.startsWith('did:') ? subject : new AtUri(subject).host
      const [strikeEvents, takedownEvents] = await Promise.all([
        getStrikeEvents(labelerAgent, did),
        getAccountTakedownEvents(labelerAgent, did),
      ])
      const now = new Date()
      let totalStrikes = 0

      for (const event of strikeEvents) {
        if ('strikeCount' in event.event && event.event.strikeCount) {
          // Check if this strike has expired
          const eventDate = new Date(event.createdAt)
          let isExpired = false

          // If the event has a severity level, check its expiry
          if (event.event.severityLevel && severityLevelSettings?.value) {
            const severityLevelKey = nameToKey(event.event.severityLevel)
            const severityLevel = severityLevelSettings.value[severityLevelKey]

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
            totalStrikes += event.event.strikeCount
          }
        }
      }

      return {
        totalStrikes,
        events: strikeEvents,
        takedownEvents,
      }
    },
    enabled: !!subject,
  })

  const getRecommendedAction = (
    strikeCount: number | null,
    severityLevelData?: SeverityLevelDetail,
    policyName?: string,
    // when reverting takedowns
    isNegative: boolean = false,
  ): ActionRecommendation | null => {
    const currentStrikes = strikeData?.totalStrikes || 0

    // Handle negative strikes (for RESOLVE_APPEAL)
    if (isNegative && strikeCount !== null) {
      const negativeStrikeCount = -Math.abs(strikeCount)
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

      const formatDuration = (durationInHours: number): string => {
        if (durationInHours === Infinity) return 'permanent'
        const days = (durationInHours * HOUR) / DAY
        if (days >= 1) {
          return `${days} day${days !== 1 ? 's' : ''}`
        }
        return `${durationInHours} hour${durationInHours !== 1 ? 's' : ''}`
      }

      // Find the most recent takedown event with durationInHours to calculate time served
      const lastTakedownEvent = (strikeData?.takedownEvents || [])
        .filter((event) => {
          if (!ToolsOzoneModerationDefs.isModEventTakedown(event.event))
            return false
          return event.event.durationInHours !== undefined
        })
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )[0]

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
            lastTakedownEvent &&
            ToolsOzoneModerationDefs.isModEventTakedown(lastTakedownEvent.event)
          ) {
            const takedownDate = new Date(lastTakedownEvent.createdAt)
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
        message = `${displayStrike} will be subtracted (${currentStrikes} → ${newTotalStrikes}) - Suspension will be reduced from ${formatDuration(
          currentDuration,
        )} to ${formatDuration(newDuration)}${adjustedInfo}`
      } else if (
        currentThreshold !== null &&
        newThreshold === currentThreshold
      ) {
        message = `${displayStrike} will be subtracted (${currentStrikes} → ${newTotalStrikes}) - Suspension remains ${formatDuration(
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
        lastTakedownEvent:
          lastTakedownEvent &&
          ToolsOzoneModerationDefs.isModEventTakedown(lastTakedownEvent.event)
            ? {
                createdAt: lastTakedownEvent.createdAt,
                durationInHours: lastTakedownEvent.event.durationInHours,
              }
            : undefined,
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
    let previousOccurrences = 0
    if (policyName && severityLevelData?.name) {
      previousOccurrences = (strikeData?.events || []).filter((event) => {
        const isSameEvent =
          (ToolsOzoneModerationDefs.isModEventTakedown(event.event) ||
            ToolsOzoneModerationDefs.isModEventEmail(event.event)) &&
          event.event.severityLevel === severityLevelData.name &&
          event.event.policies?.includes(policyName)
        return isSameEvent
      }).length
    }

    // Check if this is the first occurrence and if firstOccurrenceStrikeCount is set
    let actualStrikesToApply = strikeCount || 0
    const isFirstOccurrence = previousOccurrences === 0

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

    const displayStrike = pluralize(totalStrikes, 'total strike')
    if (matchedThreshold === null) {
      return {
        totalStrikes,
        recommendedDuration: 0,
        isPermanent: false,
        suspensionDurationInHours: null,
        actualStrikesToApply,
        message: `${displayStrike} - No suspension recommended`,
      }
    }

    const formatDuration = (durationInHours: number): string => {
      const days = (durationInHours * HOUR) / DAY

      if (days >= 1) {
        return `${days} day${days !== 1 ? 's' : ''}`
      }
      return `${durationInHours} hour${durationInHours !== 1 ? 's' : ''}`
    }

    let message: string
    if (actualStrikesToApply === 0 && strikeCount && strikeCount > 0) {
      // Strikes configured but not applied due to strikeOnOccurrence
      message = `${displayStrike} (no strikes added - occurrence threshold not met)`
    } else if (isPermanent) {
      message = `${displayStrike} - Account will be permanently taken down`
    } else if (matchedThreshold !== null) {
      message = `${displayStrike} - Account will be suspended for ${formatDuration(
        recommendedDuration,
      )}`
    } else {
      message = `${displayStrike} - No suspension recommended`
    }

    const suspensionDurationInHours = isPermanent
      ? null
      : recommendedDuration / HOUR

    return {
      totalStrikes,
      recommendedDuration,
      isPermanent,
      suspensionDurationInHours,
      actualStrikesToApply,
      message,
    }
  }

  // Get the most recent TAKEDOWN/EMAIL event with policy/severity level for auto-selection
  const getLastTakedownDetails = () => {
    if (!strikeData?.events?.length) {
      return null
    }

    // Find the most recent event with policy and severity level
    const lastEventWithPolicyDetails = strikeData.events.filter((event) => {
      if (!ToolsOzoneModerationDefs.isModEventTakedown(event.event)) {
        return false
      }

      return !!event.event.policies?.length
    })[0]

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
      severityLevel: event.severityLevel,
    }
  }

  return {
    currentStrikes: strikeData?.totalStrikes || 0,
    strikeData,
    isLoading,
    getRecommendedAction,
    getLastTakedownDetails,
  }
}
