import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import {
  ToolsOzoneQueueCreateQueue,
  ToolsOzoneQueueUpdateQueue,
  ToolsOzoneQueueDeleteQueue,
} from '@atproto/api'

export const useQueueList = (filters?: { enabled?: boolean }) => {
  const labelerAgent = useLabelerAgent()

  return useQuery({
    queryKey: ['queues', filters],
    queryFn: async () => {
      const { data } = await labelerAgent.tools.ozone.queue.listQueues({
        limit: 100,
        ...(filters?.enabled !== undefined ? { enabled: filters.enabled } : {}),
      })
      return data
    },
  })
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
      queryClient.invalidateQueries(['queues'])
      toast.success('Queue created successfully')
    },
    onError: (error) => {
      if (error instanceof ToolsOzoneQueueCreateQueue.ConflictingQueueError) {
        toast.error(
          `Queue configuration conflicts with an existing queue: ${error.message}`,
        )
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
      queryClient.invalidateQueries(['queues'])
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
      queryClient.invalidateQueries(['queues'])
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
