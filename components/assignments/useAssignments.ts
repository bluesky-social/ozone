import { displayError } from '@/common/Loader'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'

const ASSIGNMENTS_QUERY_KEY = 'assignments'

export interface AssignmentView {
  id: number
  did: string
  queueId: number
  reportId?: number
  startAt: string
  endAt: string
}

export const useAssignments = (params: {
  onlyActiveAssignments?: boolean
  queueIds?: number[]
  dids?: string[]
}) => {
  const labelerAgent = useLabelerAgent()
  return useQuery({
    queryKey: [ASSIGNMENTS_QUERY_KEY, params],
    queryFn: async () => {
      const { data } = await labelerAgent.call(
        'tools.ozone.queue.getAssignments',
        params,
      )
      return (data as { assignments: AssignmentView[] }).assignments
    },
    refetchInterval: 30_000,
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
      const { data } = await labelerAgent.call(
        'tools.ozone.queue.assign',
        undefined,
        input,
      )
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
    async (input: { reportId: number; queueId: number; assign: boolean }) => {
      const { data } = await labelerAgent.call(
        'tools.ozone.report.claimReport',
        undefined,
        input,
      )
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
