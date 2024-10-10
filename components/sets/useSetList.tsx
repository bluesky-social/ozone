import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useInfiniteQuery } from '@tanstack/react-query'

export const useSetList = (searchQuery: string | null) => {
  const labelerAgent = useLabelerAgent()
  return useInfiniteQuery({
    queryKey: ['setList', { searchQuery }],
    queryFn: async ({ pageParam }) => {
      const { data } = await labelerAgent.tools.ozone.set.querySets({
        limit: 25,
        cursor: pageParam,
        ...(!!searchQuery ? { namePrefix: searchQuery } : {}),
      })
      return data
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })
}
