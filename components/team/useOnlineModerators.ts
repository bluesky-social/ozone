import { MOD_EVENTS } from '@/mod-event/constants'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useConfigContext } from '../shell/ConfigContext'
import { useLabelerAgent } from '../shell/ConfigurationContext'
import { useFullMemberList } from './useMemberList'

export const ONLINE_MODERATORS_QUERY_KEY = ['onlineModerators']

export type OnlineModerator = {
  did: string
  lastActive: Date
}

const ACTIVE_THRESHOLD = 5 * 60 * 1000
const REFETCH_INTERVAL = 5 * 1000
const STALE_TIME = 2 * 1000 // debounce protection when used with refetch below

// Event types that indicate a moderator is actively working.
const MOD_ACTION_EVENT_TYPES = [
  MOD_EVENTS.TAKEDOWN,
  MOD_EVENTS.REVERSE_TAKEDOWN,
  MOD_EVENTS.LABEL,
  MOD_EVENTS.EMAIL,
  MOD_EVENTS.COMMENT,
  MOD_EVENTS.ESCALATE,
  MOD_EVENTS.ACKNOWLEDGE,
  MOD_EVENTS.TAG,
  MOD_EVENTS.MUTE,
  MOD_EVENTS.UNMUTE,
  MOD_EVENTS.RESOLVE_APPEAL,
  MOD_EVENTS.SET_PRIORITY,
]

export function useOnlineModerators() {
  const labelerAgent = useLabelerAgent()
  const { config } = useConfigContext()
  const { data: members } = useFullMemberList()

  return useQuery<OnlineModerator[]>({
    queryKey: ONLINE_MODERATORS_QUERY_KEY,
    select: (moderators) =>
      members ? moderators.filter((mod) => members.has(mod.did)) : moderators,
    queryFn: async () => {
      const activeThreshold = new Date(Date.now() - ACTIVE_THRESHOLD)

      const moderatorActivity = new Map<string, Date>()
      const update = (did: string, activityDate: Date) => {
        const existing = moderatorActivity.get(did)
        if (!existing || activityDate > existing) {
          moderatorActivity.set(did, activityDate)
        }
      }

      // mod events
      try {
        const { data } = await labelerAgent.tools.ozone.moderation.queryEvents({
          createdAfter: activeThreshold.toISOString(),
          types: MOD_ACTION_EVENT_TYPES,
          limit: 30,
        })
        data.events.forEach((event) => {
          if (event.createdBy === config.did) return // block labeler events
          update(event.createdBy, new Date(event.createdAt))
        })
      } catch (err) {
        console.warn('Failed to fetch recent moderation events:', err)
      }

      // report assignments
      try {
        // In practice, reports are self-assigned
        // Can assume they reasonably indicate online status for now
        // TODO: use tools.ozone.report.queryActivities once available
        const { data: reportData } =
          await labelerAgent.tools.ozone.report.getAssignments({
            onlyActive: true,
            limit: 30,
          })
        reportData.assignments.forEach((assignment) => {
          // if recent or a temp assignment
          if (
            new Date(assignment.startAt) > activeThreshold ||
            assignment.endAt
          ) {
            update(assignment.did, new Date(assignment.startAt))
          }
        })
      } catch (err) {
        console.warn('Failed to fetch active report assignments:', err)
      }

      // Sort by most recent
      const onlineModerators = Array.from(moderatorActivity.entries())
        .map(([did, lastActive]) => ({ did, lastActive: new Date(lastActive) }))
        .sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime())

      return onlineModerators
    },
    refetchInterval: REFETCH_INTERVAL,
    staleTime: STALE_TIME,
    retry: false,
  })
}

export function useRefetchOnlineModerators() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.refetchQueries({
      queryKey: ONLINE_MODERATORS_QUERY_KEY,
      stale: true,
    })
  }
}
