import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type RefObject } from 'react'
import {
  activityParams,
  utcToday,
  type ModeratorFilters,
} from './moderatorActivity'
import type { StatsWindow } from './stats/statsWindow'

let nextSession = 0
const sessions = new WeakMap<object, number>()
function sessionForAgent(agent: object) {
  let session = sessions.get(agent)
  if (session === undefined) {
    session = ++nextSession
    sessions.set(agent, session)
  }
  return session
}

export function useModeratorActivity(
  filters: ModeratorFilters,
  statsWindow: StatsWindow,
  container: RefObject<HTMLDivElement | null>,
  liveRefresh: boolean,
) {
  const agent = useLabelerAgent()
  const client = useQueryClient()
  // Isolate private history when credentials or the configured server change.
  const session = sessionForAgent(agent)
  const params = activityParams(filters, statsWindow)
  const queryKey = ['moderatorActivity', session, params] as const
  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam, signal }) =>
      (
        await agent.tools.ozone.report.queryModeratorActivity(
          { ...params, cursor: pageParam },
          { signal },
        )
      ).data,
    getNextPageParam: (page) => page.cursor,
    cacheTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
  const [now, setNow] = useState(Date.now)
  const reviewDay = statsWindow.endDate.slice(0, 10)
  const rolledOver = reviewDay !== utcToday(now)
  const pageCount = query.data?.pages.length ?? 0
  const { refetch, isFetching, isError } = query
  useEffect(() => {
    const timer = setInterval(() => {
      const time = Date.now()
      setNow(time)
      const root = container.current
      const scroller = root?.closest('[data-analytics-scroll]')
      if (
        !liveRefresh ||
        filters.period !== 'Today' ||
        reviewDay !== utcToday(time) ||
        document.visibilityState !== 'visible' ||
        pageCount !== 1 ||
        isFetching ||
        isError ||
        !root ||
        root.querySelector('details[open]') ||
        root.querySelector('[data-activity-id] :focus') ||
        (scroller?.scrollTop ?? window.scrollY) > 50
      )
        return
      void refetch()
    }, 30_000)
    return () => clearInterval(timer)
  }, [
    liveRefresh,
    filters.period,
    reviewDay,
    pageCount,
    isFetching,
    isError,
    container,
    refetch,
  ])

  return {
    rows: query.data?.pages.flatMap((page) => page.rows) ?? [],
    cursor: query.hasNextPage,
    loading: query.isLoading,
    loadingOlder: query.isFetchingNextPage,
    refreshing:
      query.isFetching && !query.isLoading && !query.isFetchingNextPage,
    error: query.error,
    updatedAt: query.dataUpdatedAt,
    rolledOver,
    refresh: () => client.resetQueries({ queryKey, exact: true }),
    loadOlder: () => query.fetchNextPage(),
  }
}
