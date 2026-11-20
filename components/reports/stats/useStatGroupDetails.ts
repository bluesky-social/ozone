import type { Agent, ToolsOzoneReportGetStatGroupDetails } from '@atproto/api'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { clearQueryData, isQueueUnavailable } from '@/queues/access'
import { useLabelerAgent } from '@/shell/ConfigurationContext'

export const statGroupDetailsQueryOptions = (
  agent: Agent,
  params: ToolsOzoneReportGetStatGroupDetails.QueryParams,
) => ({
  queryKey: ['report', 'getStatGroupDetails', params],
  queryFn: async ({ signal }: { signal?: AbortSignal }) => {
    const { data } = await agent.tools.ozone.report.getStatGroupDetails(
      params,
      { signal },
    )
    return data
  },
  refetchInterval: 60 * 1000,
  staleTime: 30 * 1000,
  retry: (count: number, error: unknown) =>
    !isQueueUnavailable(error) && count < 2,
})

export function useStatGroupDetails(
  params: ToolsOzoneReportGetStatGroupDetails.QueryParams,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const agent = useLabelerAgent()
  const client = useQueryClient()
  const options = statGroupDetailsQueryOptions(agent, params)
  return useQuery({
    ...options,
    enabled,
    onError: (error) => {
      if (isQueueUnavailable(error)) clearQueryData(client, options.queryKey)
    },
  })
}
