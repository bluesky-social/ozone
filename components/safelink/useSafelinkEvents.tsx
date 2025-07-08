'use client'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { ToolsOzoneSafelinkDefs } from '@atproto/api'

export const useSafelinkEvents = ({
  urls,
  pattern,
}: {
  urls?: string[]
  pattern?: ToolsOzoneSafelinkDefs.PatternType
}) => {
  const labelerAgent = useLabelerAgent()

  return useInfiniteQuery({
    queryKey: ['safelink-events', { urls, pattern }],
    queryFn: async ({ pageParam }) => {
      const queryParams: any = {
        limit: 25,
        cursor: pageParam,
      }

      if (urls?.length) {
        queryParams.urls = urls
      }

      if (pattern) {
        queryParams.patternType = pattern
      }

      const { data } = await labelerAgent.tools.ozone.safelink.queryEvents(
        queryParams,
      )
      return data
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
    enabled: !!labelerAgent,
  })
}
