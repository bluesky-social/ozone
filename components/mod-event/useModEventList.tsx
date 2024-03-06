import { useInfiniteQuery } from '@tanstack/react-query'
import client from '@/lib/client'
import { useContext, useEffect, useReducer, useState } from 'react'
import { AuthContext } from '@/shell/AuthContext'
import { ComAtprotoAdminQueryModerationEvents } from '@atproto/api'
import { MOD_EVENT_TITLES } from './constants'
import { addDays } from 'date-fns'

export type ModEventListQueryOptions = {
  queryOptions?: {
    refetchInterval?: number
  }
}

type CommentFilter = {
  enabled: boolean
  keyword: string
}

// Since we use default browser's date picker, we need to format the date to the correct format
// More details here: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/datetime-local
export const formatDateForInput = (date: Date) => {
  return date.toISOString().split('.')[0]
}

export const FIRST_EVENT_TIMESTAMP = '2022-11-01T00:00'
const allTypes = Object.keys(MOD_EVENT_TITLES)
const initialListState = {
  types: allTypes,
  includeAllUserRecords: false,
  commentFilter: { enabled: false, keyword: '' },
  createdBy: undefined,
  subject: undefined,
  oldestFirst: false,
  createdBefore: formatDateForInput(addDays(new Date(), 1)),
  createdAfter: FIRST_EVENT_TIMESTAMP,
  reportTypes: [],
  addedLabels: [],
  removedLabels: [],
  addedTags: '',
  removedTags: '',
}

// The 2 fields need overriding because in the initialState, they are set as undefined so the alternative string type is not accepted without override
export type EventListState = Omit<
  typeof initialListState,
  'subject' | 'createdBy'
> & {
  subject?: string
  createdBy?: string
  reportTypes: string[]
  addedLabels: string[]
  removedLabels: string[]
}

type EventListFilterPayload =
  | { field: 'types'; value: string[] }
  | { field: 'includeAllUserRecords'; value: boolean }
  | { field: 'commentFilter'; value: CommentFilter }
  | { field: 'createdBy'; value: string | undefined }
  | { field: 'subject'; value: string | undefined }
  | { field: 'oldestFirst'; value: boolean }
  | { field: 'createdBefore'; value: string }
  | { field: 'createdAfter'; value: string }
  | { field: 'reportTypes'; value: string[] }
  | { field: 'addedLabels'; value: string[] }
  | { field: 'removedLabels'; value: string[] }
  | { field: 'addedTags'; value: string }
  | { field: 'removedTags'; value: string }

type EventListAction =
  | {
      type: 'SET_FILTER'
      payload: EventListFilterPayload
    }
  | {
      type: 'RESET'
    }

const eventListReducer = (state: EventListState, action: EventListAction) => {
  switch (action.type) {
    case 'SET_FILTER':
      // when updating the subject, if the value is the same as the current state, don't update
      if (
        action.payload.field === 'subject' &&
        action.payload.value === state.subject
      ) {
        return state
      }
      return { ...state, [action.payload.field]: action.payload.value }
    case 'RESET':
      return initialListState
    default:
      return state
  }
}

export const useModEventList = (
  props: { subject?: string; createdBy?: string } & ModEventListQueryOptions,
) => {
  const { isLoggedIn } = useContext(AuthContext)
  const [listState, dispatch] = useReducer(eventListReducer, initialListState)

  const setCommentFilter = (value: CommentFilter) => {
    dispatch({ type: 'SET_FILTER', payload: { field: 'commentFilter', value } })
  }

  useEffect(() => {
    dispatch({
      type: 'SET_FILTER',
      payload: { field: 'subject', value: props.subject },
    })
  }, [props.subject])

  useEffect(() => {
    if (props.createdBy !== listState.createdBy) {
      dispatch({
        type: 'SET_FILTER',
        payload: { field: 'createdBy', value: props.createdBy },
      })
    }
  }, [props.createdBy])

  const results = useInfiniteQuery({
    enabled: isLoggedIn,
    queryKey: ['modEventList', { listState }],
    queryFn: async ({ pageParam }) => {
      const {
        types,
        includeAllUserRecords,
        commentFilter,
        createdBy,
        subject,
        oldestFirst,
        createdBefore,
        createdAfter,
        addedLabels,
        removedLabels,
        addedTags,
        removedTags,
        reportTypes,
      } = listState
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

      if (reportTypes.length) {
        queryParams.reportTypes = reportTypes
      }

      if (addedLabels.length) {
        queryParams.addedLabels = addedLabels
      }

      if (removedLabels.length) {
        queryParams.removedLabels = removedLabels
      }

      const filterTypes = types.filter(Boolean)
      if (filterTypes.length < allTypes.length && filterTypes.length > 0) {
        queryParams.types = filterTypes
      }

      if (oldestFirst) {
        queryParams.sortDirection = 'asc'
      }

      if (commentFilter.enabled) {
        queryParams.hasComment = true

        if (commentFilter.keyword) {
          queryParams.comment = commentFilter.keyword
        }
      }

      if (addedTags?.trim().length) {
        queryParams.addedTags = addedTags.trim().split(',')
      }
      if (removedTags?.trim().length) {
        queryParams.addedTags = removedTags.trim().split(',')
      }

      return await getModerationEvents(queryParams)
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
    ...(props.queryOptions || {}),
  })

  const hasFilter =
    (listState.types.length > 0 &&
      listState.types.length !== allTypes.length) ||
    listState.includeAllUserRecords ||
    listState.commentFilter.enabled ||
    listState.createdBy ||
    listState.subject ||
    listState.oldestFirst ||
    listState.reportTypes.length > 0 ||
    listState.addedLabels.length > 0 ||
    listState.removedLabels.length > 0 ||
    listState.addedTags.length > 0 ||
    listState.removedTags.length > 0

  return {
    // Data from react-query
    modEvents: results.data?.pages.map((page) => page.events).flat() || [],
    fetchMoreModEvents: results.fetchNextPage,
    hasMoreModEvents: results.hasNextPage,
    refetchModEvents: results.refetch,
    isInitialLoadingModEvents: results.isInitialLoading,

    // Helper functions to mutate state
    toggleCommentFilter: () => {
      if (listState.commentFilter.enabled) {
        return setCommentFilter({ enabled: false, keyword: '' })
      }
      return setCommentFilter({ enabled: true, keyword: '' })
    },
    setCommentFilterKeyword: (keyword: string) => {
      setCommentFilter({ enabled: true, keyword })
    },
    changeListFilter: (payload: EventListFilterPayload) =>
      dispatch({ type: 'SET_FILTER', payload: payload }),
    resetListFilters: () => dispatch({ type: 'RESET' }),

    // State data
    ...listState,

    // Derived data from state
    hasFilter,
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
    { headers: client.proxyHeaders() },
  )
  return data
}
