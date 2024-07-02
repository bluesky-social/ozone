import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useInfiniteQuery } from '@tanstack/react-query'

export const useMemberList = () => {
  const labelerAgent = useLabelerAgent()
  return useInfiniteQuery({
    queryKey: ['memberList'],
    queryFn: async ({ pageParam }) => {
      const { data } = await labelerAgent.api.tools.ozone.team.listMembers({
        limit: 25,
        cursor: pageParam,
      })
      return data
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })
}
