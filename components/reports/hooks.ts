import { useMutation, useQueryClient } from '@tanstack/react-query'
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
