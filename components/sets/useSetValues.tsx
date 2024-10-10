import { useLabelerAgent } from '@/shell/ConfigurationContext'
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'react-toastify'

export const useSetValueList = (name: string) => {
  const labelerAgent = useLabelerAgent()

  return useInfiniteQuery({
    queryKey: ['setValues', { name }],
    queryFn: async ({ pageParam }) => {
      const { data } = await labelerAgent.tools.ozone.set.getValues({
        limit: 25,
        cursor: pageParam,
        name,
      })
      return data
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })
}

export const useSetValueEditor = (name: string) => {
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: string[]) => {
      return labelerAgent.tools.ozone.set.addValues({ name, values })
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['setValues', { name }])
    },
    onError: (err) => {
      toast.error(`Error adding values: ${(err as Error).message}`)
    },
  })
}

export const useSetValueRemover = (name: string) => {
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: string[]) => {
      return labelerAgent.tools.ozone.set.deleteValues({ name, values })
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['setValues', { name }])
      toast.success('Removed value from set')
    },
    onError: (err) => {
      toast.error(`Error removing values: ${(err as Error).message}`)
    },
  })
}
