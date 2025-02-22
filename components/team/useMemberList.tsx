import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { ToolsOzoneTeamDefs } from '@atproto/api'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { MemberRoleNames } from './helpers'

export const useMemberList = () => {
  const labelerAgent = useLabelerAgent()
  const [roles, setRoles] = useState<string[]>(Object.keys(MemberRoleNames))
  const [disabled, setDisabled] = useState<boolean | undefined>(false)

  const results = useInfiniteQuery({
    queryKey: ['memberList', { disabled, roles }],
    queryFn: async ({ pageParam }) => {
      const { data } = await labelerAgent.tools.ozone.team.listMembers({
        roles,
        disabled,
        limit: 50,
        cursor: pageParam,
      })
      return data
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })

  return {
    ...results,
    disabled,
    setDisabled,
    roles,
    setRoles,
  }
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
