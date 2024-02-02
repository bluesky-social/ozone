import { useInfiniteQuery } from '@tanstack/react-query'
import client from '@/lib/client'
import { useContext, useEffect, useState } from 'react'
import { AuthContext } from '@/shell/AuthContext'
import { ComAtprotoAdminQueryModerationEvents } from '@atproto/api'
import { MOD_EVENT_TITLES } from './constants'

export type ModEventListQueryOptions = {
  queryOptions?: {
    refetchInterval?: number
  }
}

type CommentFilter = {
  enabled: boolean
  keyword: string
}

export const FIRST_EVENT_TIMESTAMP = '2022-11-01T00:00'
const allTypes = Object.keys(MOD_EVENT_TITLES)

export const useModEventList = (
  props: { subject?: string; createdBy?: string } & ModEventListQueryOptions,
) => {
  const { isLoggedIn } = useContext(AuthContext)
  const [createdAfter, setCreatedAfter] = useState<string>(
    FIRST_EVENT_TIMESTAMP,
  )
  const [createdBefore, setCreatedBefore] = useState<string>(
    new Date().toISOString().split('.')[0],
  )
  const [subject, setSubject] = useState<string | undefined>(props.subject)
  const [createdBy, setCreatedBy] = useState<string | undefined>(
    props.createdBy,
  )
  const [types, setTypes] = useState<string[]>(allTypes)
  const [oldestFirst, setOldestFirst] = useState<boolean>(false)
  const [commentFilter, setCommentFilter] = useState<CommentFilter>({
    enabled: false,
    keyword: '',
  })
  const [includeAllUserRecords, setIncludeAllUserRecords] =
    useState<boolean>(false)

  useEffect(() => {
    if (props.subject !== subject) {
      setSubject(props.subject)
    }
  }, [props.subject])

  useEffect(() => {
    if (props.createdBy !== createdBy) {
      setCreatedBy(props.createdBy)
    }
  }, [props.createdBy])

  const results = useInfiniteQuery({
    enabled: isLoggedIn,
    queryKey: [
      'modEventList',
      {
        createdBy,
        subject,
        types,
        includeAllUserRecords,
        commentFilter,
        oldestFirst,
        createdAfter,
        createdBefore,
      },
    ],
    queryFn: async ({ pageParam }) => {
      const queryParams: ComAtprotoAdminQueryModerationEvents.QueryParams = {
        cursor: pageParam,
        includeAllUserRecords,
      }

      if (subject?.trim()) {
        queryParams.subject = subject.trim()
      }

      if (createdBy?.trim()) {
        queryParams.createdBy = createdBy
      }

      if (createdAfter) {
        queryParams.createdAfter = new Date(createdAfter).toISOString()
      }

      if (createdBefore) {
        queryParams.createdBefore = new Date(createdBefore).toISOString()
      }

      const filterTypes = types.filter(Boolean)
      if (filterTypes.length < allTypes.length && filterTypes.length > 0) {
        queryParams.types = allTypes
      }

      if (oldestFirst) {
        queryParams.sortDirection = 'asc'
      }

      if (commentFilter.enabled) {
        queryParams.hasComment = true

        if (commentFilter.keyword) {
          queryParams.commentKeyword = commentFilter.keyword
        }
      }

      return await getModerationEvents(queryParams)
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
    ...(props.queryOptions || {}),
  })

  const hasFilter =
    (types.length > 0 &&
      types.length !== Object.keys(MOD_EVENT_TITLES).length) ||
    includeAllUserRecords ||
    commentFilter.enabled ||
    createdBy ||
    subject ||
    oldestFirst

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
    hasFilter,
    commentFilter,
    toggleCommentFilter: () => {
      setCommentFilter((prev) => {
        if (prev.enabled) {
          return { enabled: false, keyword: '' }
        }
        return { enabled: true, keyword: '' }
      })
    },
    setCommentFilterKeyword: (keyword: string) => {
      setCommentFilter({ enabled: true, keyword })
    },
    createdBy,
    setCreatedBy,
    subject,
    setSubject,
    setOldestFirst,
    oldestFirst,
    createdBefore,
    setCreatedBefore,
    createdAfter,
    setCreatedAfter,
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
