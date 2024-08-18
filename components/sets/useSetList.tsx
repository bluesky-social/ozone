import client from '@/lib/client'
import { useInfiniteQuery } from '@tanstack/react-query'

export const useSetList = () =>
  useInfiniteQuery({
    queryKey: ['setList'],
    queryFn: async ({ pageParam }) => {
      const { data } = await client.api.tools.ozone.set.querySets(
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
