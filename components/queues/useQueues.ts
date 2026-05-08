import { useLabelerAgent } from '@/shell/ConfigurationContext'
import {
  ToolsOzoneQueueCreateQueue,
  ToolsOzoneQueueDeleteQueue,
  ToolsOzoneQueueRouteReports,
  ToolsOzoneQueueUpdateQueue,
} from '@atproto/api'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'

export type QueueListFilters = {
  enabled?: boolean
  subjectType?: string
  collection?: string
  reportTypes?: string[]
  limit?: number
}

export const useQueueList = (filters?: QueueListFilters) => {
  const labelerAgent = useLabelerAgent()

  return useInfiniteQuery({
    queryKey: ['queues', filters],
    queryFn: async ({ pageParam }) => {
      const { data } = await labelerAgent.tools.ozone.queue.listQueues({
        limit: 25,
        cursor: pageParam,
        ...filters,
      })
      return data
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

export const useQueueById = (id: number | null) => {
  const { data, isLoading } = useQueueList()

  if (id === null || isNaN(id)) {
    return { queue: undefined, isLoading: false, notFound: false }
  }

  const queue = data?.pages
    .flatMap((page) => page.queues)
    .find((q) => q.id === id)

  return {
    queue,
    isLoading,
    notFound: !isLoading && !queue,
  }
}

export const useCreateQueue = () => {
  const queryClient = useQueryClient()
  const labelerAgent = useLabelerAgent()

  return useMutation({
    mutationKey: ['queues', 'create'],
    mutationFn: async (input: ToolsOzoneQueueCreateQueue.InputSchema) => {
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
    mutationFn: async (input: ToolsOzoneQueueUpdateQueue.InputSchema) => {
      const { data } = await labelerAgent.tools.ozone.queue.updateQueue(input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues'] })
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
