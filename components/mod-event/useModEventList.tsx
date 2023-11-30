import { useInfiniteQuery } from '@tanstack/react-query'
import client from '@/lib/client'
import { useContext, useState } from 'react'
import { AuthContext } from '@/shell/AuthContext'
import { ComAtprotoAdminQueryModerationEvents } from '@atproto/api'

export const useModEventList = (
  props: { subject: string } | { createdBy: string },
) => {
  const { isLoggedIn } = useContext(AuthContext)
  const [types, setTypes] = useState<string[]>([])
  const [includeAllUserRecords, setIncludeAllUserRecords] =
    useState<boolean>(false)

  const results = useInfiniteQuery({
    enabled: isLoggedIn,
    queryKey: ['modEventList', { props, types, includeAllUserRecords }],
    queryFn: async ({ pageParam }) => {
      const queryParams: ComAtprotoAdminQueryModerationEvents.QueryParams = {
        cursor: pageParam,
        includeAllUserRecords,
      }

      if ('subject' in props && props.subject.trim()) {
        queryParams.subject = props.subject.trim()
      }

      if ('createdBy' in props && props.createdBy.trim()) {
        queryParams.createdBy = props.createdBy
      }

      if (types.filter(Boolean).length) {
        queryParams.types = types.filter(Boolean)
      }

      return await getModerationEvents(queryParams)
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })

  return {
    types,
    setTypes,
    includeAllUserRecords,
    setIncludeAllUserRecords,
    modEvents: results.data?.pages.map((page) => page.events).flat() || [],
    fetchMoreModEvents: results.fetchNextPage,
    hasMoreModEvents: results.hasNextPage,
    refetchModEvents: results.refetch,
    isInitialLoadingModEvents: results.isInitialLoading,
  }
}

async function getModerationEvents(
  opts: ComAtprotoAdminQueryModerationEvents.QueryParams = {},
) {
  const { data } = await client.api.com.atproto.admin.queryModerationEvents(
    {
      limit: 25,
      ...opts,
    },
    { headers: client.adminHeaders() },
  )
  return data
}
