'use client'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useLabelerAgent } from '@/shell/ConfigurationContext'

export interface SafelinkEventsQueryParams {
  cursor?: string
  limit?: number
  urls?: string[]
  domains?: string[]
}

export const useSafelinkEvents = (searchQuery = '') => {
  const labelerAgent = useLabelerAgent()

  return useInfiniteQuery({
    queryKey: ['safelink-events', searchQuery],
    queryFn: async ({ pageParam }) => {
      const queryParams: any = {
        limit: 25,
        cursor: pageParam,
      }

      if (searchQuery) {
        // For search, we'll search both URLs and domains
        queryParams.urls = [searchQuery]
        queryParams.domains = [searchQuery]
      }

      const { data } = await labelerAgent.tools.ozone.safelink.queryEvents(queryParams)
      return data
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
    enabled: !!labelerAgent,
  })
}