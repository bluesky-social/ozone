import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLabelerAgent } from '../shell/ConfigurationContext'

export const ONLINE_MODERATORS_QUERY_KEY = ['onlineModerators']

export type OnlineModerator = {
  did: string
  lastActive: Date
}

const REFETCH_INTERVAL = 2 * 60 * 1000
const STALE_TIME = 20 * 1000 // debounce protection when used with refetch below

export function useOnlineModerators() {
  const labelerAgent = useLabelerAgent()

  return useQuery<OnlineModerator[]>({
    queryKey: ONLINE_MODERATORS_QUERY_KEY,
    queryFn: async ({ signal }) => {
      const { data } = await labelerAgent.tools.ozone.team.listOnlineMembers(
        { limit: 100 },
        { signal },
      )

      return data.members.map(({ did, lastActive }) => ({
        did,
        lastActive: new Date(lastActive),
      }))
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
