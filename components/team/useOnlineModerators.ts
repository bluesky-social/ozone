import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLabelerAgent } from '../shell/ConfigurationContext'

export const ONLINE_MODERATORS_QUERY_KEY = ['onlineModerators']

export type OnlineModerator = {
  did: string
  lastActive: Date
}

const ACTIVE_THRESHOLD = 5 * 60 * 1000
const REFETCH_INTERVAL = 5 * 1000
const STALE_TIME = 2 * 1000 // debounce protection when used with refetch below

export function useOnlineModerators() {
  const labelerAgent = useLabelerAgent()

  return useQuery<OnlineModerator[]>({
    queryKey: ONLINE_MODERATORS_QUERY_KEY,
    queryFn: async () => {
      const moderatorActivity = new Map<string, Date>()
      const activeThreshold = new Date(Date.now() - ACTIVE_THRESHOLD)

      const updateMod = (did: string, activityTime: Date) => {
        if (activityTime < activeThreshold) return
        if (did === labelerAgent?.did) return
        const existing = moderatorActivity.get(did)
        if (!existing || activityTime.getTime() > existing.getTime()) {
          moderatorActivity.set(did, activityTime)
        }
      }

      // mod events
      try {
        const { data } = await labelerAgent.tools.ozone.moderation.queryEvents({
          createdAfter: activeThreshold.toISOString(),
          limit: 30,
        })
        data.events.forEach((event) => {
          updateMod(event.createdBy, new Date(event.createdAt))
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
            limit: 10,
          })
        reportData.assignments.forEach((assignment) => {
          updateMod(assignment.did, new Date(assignment.startAt))
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
