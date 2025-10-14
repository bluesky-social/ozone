import { useQuery } from '@tanstack/react-query'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { strikeToSuspensionDurationInHours } from './strikes'
import { HOUR, DAY } from '@/lib/util'
import { AtUri, ToolsOzoneModerationDefs } from '@atproto/api'
import { useSeverityLevelSetting } from '@/setting/severity-level/useSeverityLevel'

type ActionRecommendation = {
  totalStrikes: number
  recommendedDuration: number
  isPermanent: boolean
  suspensionDurationInHours: number | null
  message: string
}

export const useActionRecommendation = (subject: string) => {
  const labelerAgent = useLabelerAgent()
  const { data: severityLevelSettings } = useSeverityLevelSetting()

  const { data: strikeData, isLoading } = useQuery({
    queryKey: ['strikeEvents', subject, severityLevelSettings],
    queryFn: async () => {
      if (!subject) {
        return { totalStrikes: 0, events: [] }
      }

      const did = subject.startsWith('did:') ? subject : new AtUri(subject).host

      // TODO: paginate if needed
      const { data } = await labelerAgent.tools.ozone.moderation.queryEvents({
        subject: did,
        // minStrikeCount: 1,
        includeAllUserRecords: true,
        limit: 100, // Adjust as needed
      })

      // Calculate total strike count from events, excluding expired strikes
      const now = new Date()
      let totalStrikes = 0

      for (const event of data.events) {
        if (
          ToolsOzoneModerationDefs.isModEventTakedown(event.event) &&
          event.event.strikeCount
        ) {
          // Check if this strike has expired
          const eventDate = new Date(event.createdAt)
          let isExpired = false

          // If the event has a severity level, check its expiry
          if (event.event.severityLevel && severityLevelSettings?.value) {
            const severityLevelKey = event.event.severityLevel
              .toLowerCase()
              .replace(/\s/g, '-')
            const severityLevel = severityLevelSettings.value[severityLevelKey]

            if (severityLevel?.expiryInDays) {
              const expiryDate = new Date(eventDate)
              expiryDate.setDate(expiryDate.getDate() + severityLevel.expiryInDays)
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
        events: data.events,
      }
    },
    enabled: !!subject,
  })

  const getRecommendedAction = (
    policy: string,
    severityLevel: string,
    strikeCount: number | null,
    severityLevelData?: { needsTakedown?: boolean },
  ): ActionRecommendation | null => {
    const currentStrikes = strikeData?.totalStrikes || 0
    const totalStrikes = currentStrikes + (strikeCount || 0)

    // If severity level requires immediate takedown, return permanent takedown
    if (severityLevelData?.needsTakedown) {
      return {
        totalStrikes,
        recommendedDuration: 0,
        isPermanent: true,
        suspensionDurationInHours: null,
        message: `${totalStrikes} previous strikes but account will be permanently taken down because severity level requires takedown`,
      }
    }

    // Find the matching threshold in strikeToSuspensionDurationInHours
    // The mapping keys are thresholds that trigger specific durations
    const sortedThresholds = Object.keys(strikeToSuspensionDurationInHours)
      .map(Number)
      .sort((a, b) => a - b)

    let recommendedDuration = 0
    let isPermanent = false
    let matchedThreshold: number | null = null

    for (const threshold of sortedThresholds) {
      if (totalStrikes >= threshold) {
        matchedThreshold = threshold
        const duration = strikeToSuspensionDurationInHours[threshold]
        isPermanent = duration === Infinity
        recommendedDuration = isPermanent ? 0 : duration
      }
    }

    if (matchedThreshold === null) {
      return {
        totalStrikes,
        recommendedDuration: 0,
        isPermanent: false,
        suspensionDurationInHours: null,
        message: `${totalStrikes} total strikes - No suspension recommended`,
      }
    }

    const formatDuration = (durationInMs: number): string => {
      const hours = durationInMs / HOUR
      const days = durationInMs / DAY

      if (days >= 1) {
        return `${days} day${days !== 1 ? 's' : ''}`
      }
      return `${hours} hour${hours !== 1 ? 's' : ''}`
    }

    const message = isPermanent
      ? `${totalStrikes} total strikes - Account will be permanently taken down`
      : `${totalStrikes} total strikes - Account will be suspended for ${formatDuration(
          recommendedDuration,
        )}`

    const suspensionDurationInHours = isPermanent
      ? null
      : recommendedDuration / HOUR

    return {
      totalStrikes,
      recommendedDuration,
      isPermanent,
      suspensionDurationInHours,
      message,
    }
  }

  return {
    currentStrikes: strikeData?.totalStrikes || 0,
    strikeData,
    isLoading,
    getRecommendedAction,
  }
}
