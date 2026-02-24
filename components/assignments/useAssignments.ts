import { useEffect, useRef, useCallback } from 'react'
import { displayError } from '@/common/Loader'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { MINUTE } from '@/lib/util'

const ASSIGNMENTS_QUERY_KEY = 'assignments'

export interface AssignmentView {
  id: number
  did: string
  queueId: number
  reportId?: number
  startAt: string
  endAt: string
}

export const useQueueAssignments = (params: {
  onlyActiveAssignments?: boolean
  queueIds?: number[]
  dids?: string[]
}) => {
  const labelerAgent = useLabelerAgent()
  return useQuery({
    queryKey: [ASSIGNMENTS_QUERY_KEY, params],
    queryFn: async () => {
      const { data } =
        await labelerAgent.tools.ozone.queue.getAssignments(params)
      return (data as { assignments: AssignmentView[] }).assignments
    },
    refetchInterval: 30_000,
    onError: (err) => {
      toast.error(`Failed to load assignments:\n${err}`)
    },
  })
}

export const useReportAssignments = (params: {
  reportIds: number[]
  onlyActiveAssignments?: boolean
  dids?: string[]
}) => {
  const labelerAgent = useLabelerAgent()
  return useQuery({
    queryKey: [ASSIGNMENTS_QUERY_KEY, params],
    queryFn: async () => {
      const { data } =
        await labelerAgent.tools.ozone.report.getAssignments(params)
      return (data as { assignments: AssignmentView[] }).assignments
    },
    refetchInterval: 5_000,
    onError: (err) => {
      toast.error(`Failed to load assignments:\n${err}`)
    },
  })
}

export const useAssignQueue = () => {
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()
  return useMutation(
    async (input: { did: string; queueId: number; assign: boolean }) => {
      const { data } =
        await labelerAgent.tools.ozone.queue.assignModerator(input)
      return data as AssignmentView
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

export const useClaimReport = () => {
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()
  return useMutation(
    async (input: { reportId: number; queueId?: number; assign: boolean }) => {
      const { data } =
        await labelerAgent.tools.ozone.report.assignModerator(input)
      return data as AssignmentView
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

const AUTO_CLAIM_INTERVAL_MS = 3 * MINUTE

export const useAutoClaimReport = ({
  reportId,
  queueId,
}: {
  reportId: number
  queueId?: number
}) => {
  const labelerAgent = useLabelerAgent()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const claim = useCallback(async () => {
    try {
      await labelerAgent.tools.ozone.report.assignModerator({
        reportId,
        queueId,
        assign: true,
      })
    } catch (err) {
      toast.error(displayError(err))
    }
  }, [labelerAgent, reportId, queueId])

  const unclaim = useCallback(async () => {
    try {
      await labelerAgent.tools.ozone.report.assignModerator({
        reportId,
        queueId,
        assign: false,
      })
    } catch {
      // best-effort unclaim on unmount
    }
  }, [labelerAgent, reportId, queueId])

  useEffect(() => {
    claim()
    intervalRef.current = setInterval(claim, AUTO_CLAIM_INTERVAL_MS)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      unclaim()
    }
  }, [claim, unclaim])
}
