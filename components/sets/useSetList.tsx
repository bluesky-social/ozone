import { useLabelerAgent } from '@/shell/ConfigurationContext'
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'react-toastify'

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

export const useSetRemove = (name: string) => {
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ['setRemove', { name }],
    mutationFn: async () => {
      await labelerAgent.tools.ozone.set.deleteSet({ name })
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['setList'])
      toast.success(`Set ${name} removed!`)
    },
    onError: (err) => {
      toast.error(`Error removing set ${name}: ${(err as Error).message}`)
    },
  })
}
