import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { clearQueryData, isReportUnavailable } from '@/queues/access'

export function useReport(reportId: number) {
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()
  const queryKey = ['report', reportId]
  const query = useQuery({
    queryKey,
    enabled: Number.isSafeInteger(reportId) && reportId > 0,
    queryFn: async ({ signal }) => {
      const { data } = await labelerAgent.tools.ozone.report.getReport(
        { id: reportId },
        { signal },
      )
      return data
    },
    staleTime: 0,
    refetchOnMount: 'always',
    retry: (count, error) => !isReportUnavailable(error) && count < 2,
    onError: (error) => {
      if (isReportUnavailable(error)) clearQueryData(queryClient, queryKey)
    },
  })

  return {
    ...query,
    // A list result or an earlier successful read does not establish access
    // for this visit. Wait for getReport, and discard stale data on rejection.
    report:
      query.isFetchedAfterMount && !query.isError ? query.data : undefined,
  }
}
