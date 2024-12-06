import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { ToolsOzoneTeamDefs } from '@atproto/api'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

export const useMemberList = () => {
  const labelerAgent = useLabelerAgent()
  return useInfiniteQuery({
    queryKey: ['memberList'],
    queryFn: async ({ pageParam }) => {
      const { data } = await labelerAgent.tools.ozone.team.listMembers({
        limit: 25,
        cursor: pageParam,
      })
      return data
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })
}

export const useFullMemberList = () => {
  const labelerAgent = useLabelerAgent()
  return useQuery({
    refetchOnWindowFocus: false,
    queryKey: ['memberList', 'full'],
    queryFn: async () => {
      let cursor: string | undefined
      const members = new Map<string, ToolsOzoneTeamDefs.Member>()
      // This is kind of a hack to prevent infinite loops for whatever reason
      // but if a labeler ends up with more than 2000 members, this will no longer work well
      const maxPages = 20
      let page = 0
      do {
        const { data } = await labelerAgent.tools.ozone.team.listMembers({
          limit: 100,
          cursor,
        })
        data.members.forEach((member) => members.set(member.did, member))
        cursor = data.cursor
        page++
      } while (cursor && page < maxPages)
      return members
    },
  })
}
