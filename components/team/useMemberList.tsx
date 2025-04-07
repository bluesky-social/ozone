import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { Agent, ToolsOzoneTeamListMembers } from '@atproto/api'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { MemberRoleNames } from './helpers'

export const getMembersList = async (
  agent: Agent,
  params: ToolsOzoneTeamListMembers.QueryParams,
) => {
  const { data } = await agent.tools.ozone.team.listMembers(params)
  return data
}

export const useMemberList = (q?: string) => {
  const labelerAgent = useLabelerAgent()
  const [roles, setRoles] = useState<string[]>(Object.keys(MemberRoleNames))
  const [disabled, setDisabled] = useState<boolean | undefined>(false)

  const results = useInfiniteQuery({
    queryKey: ['memberList', { disabled, roles, q }],
    queryFn: async ({ pageParam }) => {
      return getMembersList(labelerAgent, {
        q,
        roles,
        disabled,
        limit: 50,
        cursor: pageParam,
      })
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
