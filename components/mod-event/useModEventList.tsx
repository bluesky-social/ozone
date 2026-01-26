import {
  Agent,
  AtUri,
  ChatBskyConvoDefs,
  ComAtprotoAdminDefs,
  ComAtprotoModerationDefs,
  ComAtprotoRepoStrongRef,
  ToolsOzoneModerationDefs,
  ToolsOzoneModerationQueryEvents,
} from '@atproto/api'
import { useInfiniteQuery } from '@tanstack/react-query'
import { addDays } from 'date-fns'
import { useEffect, useReducer, useRef, useState } from 'react'

import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { MOD_EVENT_TITLES, MOD_EVENTS } from './constants'
import { useWorkspaceAddItemsMutation } from '@/workspace/hooks'
import {
  DM_DISABLE_TAG,
  TRUSTED_VERIFIER_TAG,
  VIDEO_UPLOAD_DISABLE_TAG,
} from '@/lib/constants'
import { chunkArray } from '@/lib/util'
import { toast } from 'react-toastify'
import { stateToMacro } from './helpers/macros'

export type WorkspaceConfirmationOptions =
  | 'subjects'
  | 'creators'
  | 'subject-authors'
  | null

export type ModEventListQueryOptions = {
  queryOptions?: {
    refetchInterval?: number
  }
}

export type ModEventViewWithDetails = ToolsOzoneModerationDefs.ModEventView & {
  repo?: ToolsOzoneModerationDefs.RepoViewDetail
  record?: ToolsOzoneModerationDefs.RecordViewDetail
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
  batchId: undefined,
  oldestFirst: false,
  createdBefore: formatDateForInput(addDays(new Date(), 1)),
  createdAfter: FIRST_EVENT_TIMESTAMP,
  reportTypes: [],
  addedLabels: [],
  removedLabels: [],
  addedTags: '',
  removedTags: '',
  policies: [],
  showContentPreview: false,
  limit: 25,
  subjectType: undefined,
  selectedCollections: [],
  ageAssuranceState: undefined,
  withStrike: false,
}

const getReposAndRecordsForEvents = async (
  labelerAgent: Agent,
  events: ToolsOzoneModerationDefs.ModEventView[],
) => {
  const repos = new Map<
    string,
    ToolsOzoneModerationDefs.RepoViewDetail | undefined
  >()
  const records = new Map<
    string,
    ToolsOzoneModerationDefs.RecordViewDetail | undefined
  >()

  for (const event of events) {
    if (
      ComAtprotoAdminDefs.isRepoRef(event.subject) ||
      ChatBskyConvoDefs.isMessageRef(event.subject)
    ) {
      repos.set(event.subject.did, undefined)
    } else if (ComAtprotoRepoStrongRef.isMain(event.subject)) {
      records.set(event.subject.uri, undefined)
    }
  }

  const fetchers: Array<Promise<void>> = []

  // Right now, we're only loading 25 events at a time so this chunking never really takes effect
  // But to future proof page size change, we're implementing the chunking anyways
  if (repos.size) {
    for (const chunk of chunkArray(Array.from(repos.keys()), 50)) {
      fetchers.push(
        labelerAgent.tools.ozone.moderation
          .getRepos({ dids: chunk })
          .then(({ data }) => {
            for (const repo of data.repos) {
              if (ToolsOzoneModerationDefs.isRepoViewDetail(repo)) {
                repos.set(repo.did, repo)
              }
            }
          }),
      )
    }
  }
  if (records.size) {
    for (const chunk of chunkArray(Array.from(records.keys()), 50)) {
      fetchers.push(
        labelerAgent.tools.ozone.moderation
          .getRecords({ uris: chunk })
          .then(({ data }) => {
            for (const record of data.records) {
              if (ToolsOzoneModerationDefs.isRecordViewDetail(record)) {
                records.set(record.uri, record)
              }
            }
          }),
      )
    }
  }

  await Promise.all(fetchers)

  return { repos, records }
}

// The 3 fields need overriding because in the initialState, they are set as undefined so the alternative string type is not accepted without override
export type EventListState = Omit<
  typeof initialListState,
  'subject' | 'createdBy' | 'batchId' | 'subjectType'
> & {
  subject?: string
  createdBy?: string
  batchId?: string
  reportTypes: string[]
  addedLabels: string[]
  removedLabels: string[]
  showContentPreview: boolean
  subjectType?: 'account' | 'record'
  selectedCollections: string[]
  ageAssuranceState?: string
  withStrike?: boolean
}

type EventListFilterPayload =
  | { field: 'types'; value: string[] }
  | { field: 'includeAllUserRecords'; value: boolean }
  | { field: 'commentFilter'; value: CommentFilter }
  | { field: 'createdBy'; value: string | undefined }
  | { field: 'subject'; value: string | undefined }
  | { field: 'batchId'; value: string | undefined }
  | { field: 'oldestFirst'; value: boolean }
  | { field: 'createdBefore'; value: string }
  | { field: 'createdAfter'; value: string }
  | { field: 'reportTypes'; value: string[] }
  | { field: 'addedLabels'; value: string[] }
  | { field: 'removedLabels'; value: string[] }
  | { field: 'addedTags'; value: string }
  | { field: 'removedTags'; value: string }
  | { field: 'policies'; value: string[] }
  | { field: 'limit'; value: number }
  | { field: 'subjectType'; value?: 'account' | 'record' }
  | { field: 'selectedCollections'; value: string[] }
  | { field: 'ageAssuranceState'; value?: string }
  | { field: 'withStrike'; value?: boolean }

type EventListAction =
  | {
      type: 'SET_FILTER'
      payload: EventListFilterPayload
    }
  | {
      type: 'SET_FILTERS'
      payload: Partial<EventListState>
    }
  | {
      type: 'RESET'
    }
  | {
      type: 'TOGGLE_CONTENT_PREVIEW'
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
    case 'SET_FILTERS':
      return { ...state, ...action.payload }
    case 'RESET':
      return initialListState
    case 'TOGGLE_CONTENT_PREVIEW':
      return { ...state, showContentPreview: !state.showContentPreview }
    default:
      return state
  }
}

const getModEvents =
  (labelerAgent: Agent, listState: EventListState) =>
  async (
    {
      pageParam,
    }: {
      pageParam?: string
    },
    options: { signal?: AbortSignal } = {},
  ): Promise<{
    events: ToolsOzoneModerationDefs.ModEventView[]
    cursor?: string
  }> => {
    const {
      types,
      includeAllUserRecords,
      commentFilter,
      createdBy,
      subject,
      batchId,
      oldestFirst,
      createdBefore,
      createdAfter,
      addedLabels,
      removedLabels,
      addedTags,
      removedTags,
      reportTypes,
      policies,
      limit,
      subjectType,
      selectedCollections,
      ageAssuranceState,
      withStrike,
    } = listState
    const queryParams: ToolsOzoneModerationQueryEvents.QueryParams = {
      limit,
      cursor: pageParam,
      includeAllUserRecords,
    }

    if (subject?.trim()) {
      queryParams.subject = subject.trim()
    }

    if (createdBy?.trim()) {
      queryParams.createdBy = createdBy
    }

    if (batchId?.trim()) {
      queryParams.batchId = batchId.trim()
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

    if (ageAssuranceState) {
      queryParams.ageAssuranceState = ageAssuranceState
    }

    if (addedLabels.length) {
      queryParams.addedLabels = addedLabels
    }

    if (removedLabels.length) {
      queryParams.removedLabels = removedLabels
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

    if (selectedCollections.length && subjectType === 'record') {
      queryParams.collections = selectedCollections
    }

    if (addedTags?.trim().length) {
      queryParams.addedTags = addedTags.trim().split(',')
    }
    if (removedTags?.trim().length) {
      queryParams.addedTags = removedTags.trim().split(',')
    }

    const filterTypes = types.filter(Boolean)
    if (filterTypes.length < allTypes.length && filterTypes.length > 0) {
      queryParams.types = filterTypes.map((type) => {
        // There is a no appeal type, it's a placeholder and behind the scene
        // we use type as report and reportTypes as appeal
        if (type === MOD_EVENTS.APPEAL) {
          queryParams.reportTypes ||= []
          queryParams.reportTypes.push(ComAtprotoModerationDefs.REASONAPPEAL)
          return MOD_EVENTS.REPORT
        }

        // We use custom event type name that translate to either add or remove certain tag
        const { add, remove } = buildTagFilter(type)
        if (add.length || remove.length) {
          if (add.length) {
            if (queryParams.addedTags) {
              queryParams.addedTags.push(...add)
            } else {
              queryParams.addedTags = add
            }
          }
          if (remove.length) {
            if (queryParams.removedTags) {
              queryParams.removedTags.push(...remove)
            } else {
              queryParams.removedTags = remove
            }
          }
          return MOD_EVENTS.TAG
        }
        return type
      })
    }

    if (
      (filterTypes.includes(MOD_EVENTS.TAKEDOWN) ||
        filterTypes.includes(MOD_EVENTS.EMAIL)) &&
      policies
    ) {
      queryParams.policies = policies
    }

    if (subjectType) {
      queryParams.subjectType = subjectType
    }

    if (withStrike === true) {
      queryParams.withStrike = withStrike
      // When filtering for events with strike and there is a subject set, we always want to see all strike events across the account
      if (queryParams.subject) {
        queryParams.includeAllUserRecords = true
      }
    }

    const { data } = await labelerAgent.tools.ozone.moderation.queryEvents(
      queryParams,
      options,
    )
    const { repos, records } = await getReposAndRecordsForEvents(
      labelerAgent,
      data.events,
    )

    return {
      events: data.events.map((e) => {
        if (
          ComAtprotoAdminDefs.isRepoRef(e.subject) ||
          ChatBskyConvoDefs.isMessageRef(e.subject)
        ) {
          return { ...e, repo: repos.get(e.subject.did) }
        } else if (ComAtprotoRepoStrongRef.isMain(e.subject)) {
          return { ...e, record: records.get(e.subject.uri) }
        }
        return { ...e }
      }),
      cursor: data.cursor,
    }
  }

export const useModEventList = (
  props: {
    subject?: string
    createdBy?: string
    eventType?: string
    batchId?: string
  } & ModEventListQueryOptions,
) => {
  const [showWorkspaceConfirmation, setShowWorkspaceConfirmation] =
    useState<WorkspaceConfirmationOptions>(null)
  const { mutateAsync: addItemsToWorkspace } = useWorkspaceAddItemsMutation()
  const labelerAgent = useLabelerAgent()
  const [listState, dispatch] = useReducer(eventListReducer, initialListState)
  const abortController = useRef<AbortController | null>(null)
  const [isAddingToWorkspace, setIsAddingToWorkspace] = useState(false)

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

  useEffect(() => {
    if (props.eventType) {
      dispatch({
        type: 'SET_FILTER',
        payload: { field: 'types', value: [props.eventType] },
      })
    }
  }, [props.eventType])

  useEffect(() => {
    if (props.batchId !== listState.batchId) {
      dispatch({
        type: 'SET_FILTER',
        payload: { field: 'batchId', value: props.batchId },
      })
    }
  }, [props.batchId])

  useEffect(() => {
    if (!showWorkspaceConfirmation) {
      abortController.current?.abort()
    }
  }, [showWorkspaceConfirmation])

  const modEventsGetter = getModEvents(labelerAgent, listState)
  const addFromEventsToWorkspace = async (
    eventList: ToolsOzoneModerationDefs.ModEventView[],
  ) => {
    const items = new Set<string>()

    eventList.forEach((event) => {
      if (showWorkspaceConfirmation === 'subjects') {
        if (ComAtprotoAdminDefs.isRepoRef(event.subject)) {
          items.add(event.subject.did)
        } else if (ComAtprotoRepoStrongRef.isMain(event.subject)) {
          items.add(event.subject.uri)
        } else if (ChatBskyConvoDefs.isMessageRef(event.subject)) {
          items.add(event.subject.did)
        }
      } else if (showWorkspaceConfirmation === 'creators') {
        items.add(event.createdBy)
      } else if (showWorkspaceConfirmation === 'subject-authors') {
        if (
          ComAtprotoAdminDefs.isRepoRef(event.subject) ||
          ChatBskyConvoDefs.isMessageRef(event.subject)
        ) {
          items.add(event.subject.did)
        } else if (ComAtprotoRepoStrongRef.isMain(event.subject)) {
          items.add(new AtUri(event.subject.uri).host)
        }
      }
    })

    return addItemsToWorkspace([...items])
  }

  const results = useInfiniteQuery<{
    events: ModEventViewWithDetails[]
    cursor?: string
  }>({
    queryKey: ['modEventList', { listState }],
    queryFn: modEventsGetter,
    getNextPageParam: (lastPage) => lastPage.cursor,
    ...(props.queryOptions || {}),
  })

  const modEvents = results.data?.pages.map((page) => page.events).flat() || []

  const hasFilter =
    (listState.types.length > 0 &&
      listState.types.length !== allTypes.length) ||
    listState.includeAllUserRecords ||
    listState.commentFilter.enabled ||
    listState.createdBy ||
    listState.subject ||
    listState.batchId ||
    listState.oldestFirst ||
    listState.policies.length > 0 ||
    listState.reportTypes.length > 0 ||
    listState.addedLabels.length > 0 ||
    listState.removedLabels.length > 0 ||
    listState.addedTags.length > 0 ||
    listState.removedTags.length > 0 ||
    listState.subjectType ||
    listState.selectedCollections.length > 0 ||
    listState.ageAssuranceState ||
    listState.withStrike !== undefined

  const addToWorkspace = async () => {
    if (!showWorkspaceConfirmation) {
      return
    }

    if (!results.data?.pageParams) {
      addFromEventsToWorkspace(modEvents)
      setShowWorkspaceConfirmation(null)
      return
    }

    setIsAddingToWorkspace(true)
    const newAbortController = new AbortController()
    abortController.current = newAbortController

    try {
      let cursor = results?.data.pageParams[0] as string | undefined
      do {
        // When we just want the dids of the users, no need to do an extra fetch to include repos
        const nextPage = await modEventsGetter(
          {
            pageParam: cursor,
          },
          { signal: abortController.current?.signal },
        )
        await addFromEventsToWorkspace(nextPage.events)
        cursor = nextPage.cursor
        //   if the modal is closed, that means the user decided not to add any more user to workspace
      } while (cursor && showWorkspaceConfirmation)
    } catch (e) {
      if (abortController.current?.signal.aborted) {
        toast.info('Stopped adding to workspace')
      } else {
        toast.error(`Something went wrong: ${(e as Error).message}`)
      }
    }
    setIsAddingToWorkspace(false)
    setShowWorkspaceConfirmation(null)
  }

  return {
    // Data from react-query
    modEvents,
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
      dispatch({ type: 'SET_FILTER', payload }),
    applyFilterMacro: (payload: Partial<EventListState>) => {
      const _payload = stateToMacro(payload)
      dispatch({ type: 'SET_FILTERS', payload: _payload })
    },
    resetListFilters: () => dispatch({ type: 'RESET' }),
    toggleContentPreview: () => dispatch({ type: 'TOGGLE_CONTENT_PREVIEW' }),

    // State data
    ...listState,

    // Derived data from state
    hasFilter,

    showWorkspaceConfirmation,
    setShowWorkspaceConfirmation,
    addToWorkspace,
    isAddingToWorkspace,
  }
}

const TagBasedTypeFilters = {
  [MOD_EVENTS.DISABLE_DMS]: { add: DM_DISABLE_TAG, remove: '' },
  [MOD_EVENTS.ENABLE_DMS]: { remove: DM_DISABLE_TAG, add: '' },
  [MOD_EVENTS.DISABLE_VIDEO_UPLOAD]: {
    add: VIDEO_UPLOAD_DISABLE_TAG,
    remove: '',
  },
  [MOD_EVENTS.ENABLE_VIDEO_UPLOAD]: {
    remove: VIDEO_UPLOAD_DISABLE_TAG,
    add: '',
  },
  [MOD_EVENTS.MAKE_VERIFIER]: {
    add: TRUSTED_VERIFIER_TAG,
    remove: '',
  },
  [MOD_EVENTS.REVOKE_VERIFIER]: {
    remove: TRUSTED_VERIFIER_TAG,
    add: '',
  },
}

const buildTagFilter = (type: string) => {
  const add: string[] = []
  const remove: string[] = []

  if (!Object.hasOwn(TagBasedTypeFilters, type)) {
    return { add, remove }
  }
  if (TagBasedTypeFilters[type].add) {
    add.push(TagBasedTypeFilters[type].add)
  }
  if (TagBasedTypeFilters[type].remove) {
    remove.push(TagBasedTypeFilters[type].remove)
  }

  return { add, remove }
}
