import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ToolsOzoneReportDefs } from '@atproto/api'
import { useLabelerAgent } from '@/shell/ConfigurationContext'

export function useAssignModerator(options?: {
  onSuccess?: (data: ToolsOzoneReportDefs.AssignmentView, reportId: number) => void
  onError?: (error: unknown, reportId: number) => void
}) {
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (reportId: number) => {
      const { data } = await labelerAgent.tools.ozone.report.assignModerator({
        reportId,
        isPermanent: true,
      })
      return data
    },
    onSuccess: (data, reportId) => {
      queryClient.invalidateQueries({ queryKey: ['report', reportId] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      options?.onSuccess?.(data, reportId)
    },
    onError: (error, reportId) => {
      options?.onError?.(error, reportId)
    },
  })
}

export function useCreateActivity(options?: {
  onSuccess?: (data: ToolsOzoneReportDefs.ReportActivityView) => void
  onError?: (error: unknown) => void
}) {
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      reportId: number
      action: 'status_change' | 'note'
      toState?: string
      note?: string
      updateStatus?: boolean
    }) => {
      const { data } = await labelerAgent.tools.ozone.report.createActivity(input)
      return data.activity
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['report', data.reportId] })
      queryClient.invalidateQueries({ queryKey: ['reportActivities', data.reportId] })
      options?.onSuccess?.(data)
    },
    onError: (error) => {
      options?.onError?.(error)
    },
  })
}

export function useListActivities(reportId: number) {
  const labelerAgent = useLabelerAgent()

  return useQuery({
    queryKey: ['reportActivities', reportId],
    queryFn: async () => {
      const { data } = await labelerAgent.tools.ozone.report.listActivities({ reportId, limit: 50 })
      return data.activities
    },
  })
}
