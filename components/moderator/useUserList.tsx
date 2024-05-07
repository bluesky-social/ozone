import client from '@/lib/client'
import { useInfiniteQuery } from '@tanstack/react-query'

export const useUserList = () =>
  useInfiniteQuery({
    queryKey: ['userList'],
    queryFn: async ({ pageParam }) => {
      const { data } = await client.api.tools.ozone.moderator.listUsers(
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
