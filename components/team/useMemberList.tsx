import client from '@/lib/client'
import { useInfiniteQuery } from '@tanstack/react-query'

export const useMemberList = () =>
  useInfiniteQuery({
    queryKey: ['memberList'],
    queryFn: async ({ pageParam }) => {
      const { data } = await client.api.tools.ozone.team.listMembers(
        {
          limit: 25,
          cursor: pageParam,
        },
        { headers: client.proxyHeaders() },
      )
      return data
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })
