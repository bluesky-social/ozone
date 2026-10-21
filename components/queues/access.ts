import type { QueryClient, QueryKey } from '@tanstack/react-query'
import { persistReportListIds } from '@/reports/useReports'

export async function refreshQueueAccess(queryClient: QueryClient) {
  persistReportListIds([])
  await clearAndRefetchQueries(queryClient, [
    ['queues'],
    ['report'],
    ['betaReports'],
  ])
}

async function clearAndRefetchQueries(
  queryClient: QueryClient,
  queryKeys: QueryKey[],
) {
  await Promise.all(
    queryKeys.map((queryKey) => queryClient.cancelQueries({ queryKey })),
  )
  for (const queryKey of queryKeys) {
    for (const query of queryClient.getQueryCache().findAll({ queryKey })) {
      // Keep update counters: resetQueries resets them, which can make an
      // observer's isFetchedAfterMount stay false after a successful refetch.
      query.setState({
        data: undefined,
        dataUpdatedAt: 0,
        error: null,
        status: 'loading',
      })
    }
  }
  await Promise.all(
    queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  )
}
