import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useEffect } from 'react'
import {
  ToolsOzoneQueueCreateQueue,
  ToolsOzoneQueueDeleteQueue,
  ToolsOzoneQueueRouteReports,
  ToolsOzoneQueueUpdateQueue,
} from '@atproto/api'
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { refreshQueueAccess } from './access'

export type QueueListFilters = {
  enabled?: boolean
  subjectType?: string
  collection?: string
  reportTypes?: string[]
  limit?: number
}

export type CreateQueueInput = ToolsOzoneQueueCreateQueue.InputSchema

export type UpdateQueueInput = ToolsOzoneQueueUpdateQueue.InputSchema

export const useQueueList = (
  filters?: QueueListFilters,
  options: { refetchInterval?: number } = {},
) => {
  const labelerAgent = useLabelerAgent()

  const query = useInfiniteQuery({
    ...options,
    queryKey: ['queues', filters],
    queryFn: async ({ pageParam, signal }) => {
      const { data } = await labelerAgent.tools.ozone.queue.listQueues(
        {
          limit: 25,
          cursor: pageParam,
          ...filters,
        },
        { signal },
      )
      return data
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  return {
    ...query,
    data: query.isFetchedAfterMount && !query.isError ? query.data : undefined,
    isLoading:
      query.isLoading || (!query.isFetchedAfterMount && query.isFetching),
  }
}

export const useQueueById = (id: number | null) => {
  const { data, isLoading, isFetching, hasNextPage, fetchNextPage } =
    useQueueList()
  const queue = data?.pages
    .flatMap((page) => page.queues)
    .find((q) => q.id === id)

  useEffect(() => {
    if (id !== null && id > 0 && !queue && hasNextPage && !isFetching) {
      void fetchNextPage()
    }
  }, [id, queue, hasNextPage, isFetching, fetchNextPage])

  if (id === null || isNaN(id)) {
    return { queue: undefined, isLoading: false, notFound: false }
  }

  return {
    queue,
    isLoading: isLoading || (!queue && !!hasNextPage),
    notFound: !isLoading && !hasNextPage && !queue,
  }
}

export const useCreateQueue = () => {
  const queryClient = useQueryClient()
  const labelerAgent = useLabelerAgent()

  return useMutation({
    mutationKey: ['queues', 'create'],
    mutationFn: async (input: CreateQueueInput) => {
      const { data } = await labelerAgent.tools.ozone.queue.createQueue(input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues'] })
      toast.success('Queue created successfully')
    },
    onError: (error) => {
      if (error instanceof ToolsOzoneQueueCreateQueue.ConflictingQueueError) {
        toast.error(error.message)
      } else {
        toast.error(`Failed to create queue: ${error?.['message']}`)
      }
    },
  })
}

export const useUpdateQueue = () => {
  const queryClient = useQueryClient()
  const labelerAgent = useLabelerAgent()

  return useMutation({
    mutationKey: ['queues', 'update'],
    mutationFn: async (input: UpdateQueueInput) => {
      const { data } = await labelerAgent.tools.ozone.queue.updateQueue(input)
      return data
    },
    onSuccess: async (_data, input) => {
      if (input.strictAccess !== undefined) {
        await refreshQueueAccess(queryClient)
      } else {
        await queryClient.invalidateQueries({ queryKey: ['queues'] })
      }
      toast.success('Queue updated successfully')
    },
    onError: (error) => {
      toast.error(`Failed to update queue: ${error?.['message']}`)
    },
  })
}

export const useDeleteQueue = () => {
  const queryClient = useQueryClient()
  const labelerAgent = useLabelerAgent()

  return useMutation({
    mutationKey: ['queues', 'delete'],
    mutationFn: async (input: ToolsOzoneQueueDeleteQueue.InputSchema) => {
      const { data } = await labelerAgent.tools.ozone.queue.deleteQueue(input)
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['queues'] })
      const migrationMsg =
        data.reportsMigrated !== undefined
          ? ` (${data.reportsMigrated} reports migrated)`
          : ''
      toast.success(`Queue deleted successfully${migrationMsg}`)
    },
    onError: (error) => {
      toast.error(`Failed to delete queue: ${error?.['message']}`)
    },
  })
}

export const useLatestReport = () => {
  const labelerAgent = useLabelerAgent()

  return useQuery({
    queryKey: ['queues', 'latestReport'],
    queryFn: async () => {
      const { data } = await labelerAgent.tools.ozone.report.getLatestReport()
      return data.report
    },
  })
}

export const useRouteReports = () => {
  const labelerAgent = useLabelerAgent()

  return useMutation({
    mutationKey: ['queues', 'routeReports'],
    mutationFn: async (input: ToolsOzoneQueueRouteReports.InputSchema) => {
      const { data } = await labelerAgent.tools.ozone.queue.routeReports(input)
      return data
    },
  })
}
