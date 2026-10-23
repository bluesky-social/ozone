import type { QueryClient, QueryKey } from '@tanstack/react-query'
import { persistReportListIds } from '@/reports/useReports'

export function isQueueUnavailable(error: unknown): boolean {
  return hasErrorCode(error, 'QueueNotFound')
}

export function isReportUnavailable(error: unknown): boolean {
  return hasErrorCode(error, 'NotFound')
}

function hasErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    error.error === code
  )
}

export function clearQueryData(queryClient: QueryClient, queryKey: QueryKey) {
  // setQueryData treats undefined as a no-op. Keep the failed query's error
  // state and observer, while discarding its previously successful payload.
  queryClient.getQueryCache().find({ queryKey, exact: true })?.setState({
    data: undefined,
    dataUpdatedAt: 0,
  })
}

export async function refreshQueueAccess(queryClient: QueryClient) {
  persistReportListIds([])
  await clearAndRefetchQueries(queryClient, [
    ['queues'],
    ['report'],
    ['betaReports'],
  ])
}

export async function refreshQueueList(queryClient: QueryClient) {
  await clearAndRefetchQueries(queryClient, [['queues']])
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
