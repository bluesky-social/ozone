import { useLabelerAgent } from '@/shell/ConfigurationContext'
import {
  Agent,
  ToolsOzoneTeamDefs,
  ToolsOzoneTeamListMembers,
} from '@atproto/api'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
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

/**
 * Fetches full list of active members.
 */
export const useFullMemberList = () => {
  const labelerAgent = useLabelerAgent()

  return useQuery({
    queryKey: ['fullMemberList'],
    // expensive so use longer stale time
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const data = new Map<string, ToolsOzoneTeamDefs.Member>()
      let cursor: string | undefined
      do {
        const page = await getMembersList(labelerAgent, {
          disabled: false,
          limit: 100,
          cursor,
        })
        page.members.forEach((member) => data.set(member.did, member))
        cursor = page.cursor
      } while (cursor)
      return data
    },
  })
}
