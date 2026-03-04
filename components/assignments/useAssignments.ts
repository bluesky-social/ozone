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
  ToolsOzoneReportAssignModerator,
  ToolsOzoneReportDefs,
  ToolsOzoneReportGetAssignments,
  ToolsOzoneReportUnassignModerator,
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
      return data as ToolsOzoneQueueDefs.AssignmentView
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries([ASSIGNMENTS_QUERY_KEY])
      },
      onError: (err) => {
        toast.error(displayError(err))
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

export const useAssignReport = () => {
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()
  return useMutation(
    async (input: ToolsOzoneReportAssignModerator.InputSchema) => {
      const { data } =
        await labelerAgent.tools.ozone.report.assignModerator(input)
      return data as ToolsOzoneReportDefs.AssignmentView
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries([ASSIGNMENTS_QUERY_KEY])
      },
      onError: (err) => {
        toast.error(displayError(err))
      },
    },
  )
}

export const useUnassignReport = () => {
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()
  return useMutation(
    async (input: ToolsOzoneReportUnassignModerator.InputSchema) => {
      const { data } =
        await labelerAgent.tools.ozone.report.unassignModerator(input)
      return data as ToolsOzoneReportDefs.AssignmentView
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries([ASSIGNMENTS_QUERY_KEY])
      },
      onError: (err) => {
        toast.error(displayError(err))
      },
    },
  )
}

const AUTO_ASSIGN_INTERVAL_MS = 3 * MINUTE
export const useAutoAssignReport = ({
  reportId,
  queueId,
}: {
  reportId: number
  queueId?: number
}) => {
  const labelerAgent = useLabelerAgent()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const assign = useCallback(async () => {
    try {
      await labelerAgent.tools.ozone.report.assignModerator({
        reportId,
        queueId,
      })
    } catch (err) {
      console.warn(`Auto-assign failed. `, err)
    }
  }, [reportId, queueId, labelerAgent])

  useEffect(() => {
    assign()
    intervalRef.current = setInterval(assign, AUTO_ASSIGN_INTERVAL_MS)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [reportId, queueId])
}
