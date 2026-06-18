import { useEffect, useRef, useCallback } from 'react'
import { displayError } from '@/common/Loader'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { MINUTE } from '@/lib/util'
import {
  ToolsOzoneQueueAssignModerator,
  ToolsOzoneQueueDefs,
  ToolsOzoneQueueGetAssignments,
  ToolsOzoneQueueUnassignModerator,
  ToolsOzoneReportDefs,
  ToolsOzoneReportGetAssignments,
} from '@atproto/api'

const ASSIGNMENTS_QUERY_KEY = 'assignments'

export const useQueueAssignments = (
  params: ToolsOzoneQueueGetAssignments.QueryParams,
) => {
  const labelerAgent = useLabelerAgent()
  return useQuery({
    queryKey: [ASSIGNMENTS_QUERY_KEY, params],
    queryFn: async () => {
      const { data } =
        await labelerAgent.tools.ozone.queue.getAssignments(params)
      return (data as { assignments: ToolsOzoneQueueDefs.AssignmentView[] })
        .assignments
    },
    refetchInterval: 5000,
    onError: (err) => {
      toast.error(`Failed to load assignments:\n${err}`)
    },
  })
}

export const useAssignQueue = () => {
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()
  return useMutation(
    async (input: ToolsOzoneQueueAssignModerator.InputSchema) => {
      const { data } =
        await labelerAgent.tools.ozone.queue.assignModerator(input)
      return data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [ASSIGNMENTS_QUERY_KEY] })
      },
      onError: (err) => {
        toast.error(displayError(err))
      },
    },
  )
}

export const useUnassignQueue = (options?: {
  onSuccess?: () => void
  onError?: (err: unknown) => void
}) => {
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()
  return useMutation(
    async (input: ToolsOzoneQueueUnassignModerator.InputSchema) => {
      await labelerAgent.tools.ozone.queue.unassignModerator(input)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [ASSIGNMENTS_QUERY_KEY] })
        options?.onSuccess?.()
      },
      onError: (err) => {
        options?.onError?.(err)
      },
    },
  )
}

export const useReportAssignments = (
  params: ToolsOzoneReportGetAssignments.QueryParams,
) => {
  const labelerAgent = useLabelerAgent()
  return useQuery({
    queryKey: [ASSIGNMENTS_QUERY_KEY, params],
    queryFn: async () => {
      const { data } =
        await labelerAgent.tools.ozone.report.getAssignments(params)
      return (data as { assignments: ToolsOzoneReportDefs.AssignmentView[] })
        .assignments
    },
    refetchInterval: 5000,
    onError: (err) => {
      toast.error(`Failed to load assignments:\n${err}`)
    },
  })
}