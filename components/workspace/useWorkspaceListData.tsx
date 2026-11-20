import { chunkArray } from '@/lib/util'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { Agent, ToolsOzoneModerationDefs } from '@atproto/api'
import {
  QueryClient,
  QueryFunctionContext,
  QueryKey,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useRef } from 'react'
import { toast } from 'react-toastify'

export type WorkspaceListData = Record<
  string,
  ToolsOzoneModerationDefs.SubjectView
>

const STALE_MS = 5 * 60 * 1000
type WorkspaceCache = {
  data: WorkspaceListData
  fetchedAt: number
  subjects: string[]
}
const isFresh = (cache: WorkspaceCache) =>
  cache.fetchedAt > 0 && Date.now() - cache.fetchedAt < STALE_MS

const workspaceDataKey = (subjects: string[]) => ['workspaceListData', subjects]
const pickSubjects = (
  data: WorkspaceListData,
  subjects: string[],
): WorkspaceListData =>
  Object.fromEntries(
    subjects
      .filter((subject) => data[subject])
      .map((subject) => [subject, data[subject]]),
  )

const getSubjectsInChunks = async (
  labelerAgent: Agent,
  subjects: string[],
  signal?: AbortSignal,
): Promise<WorkspaceListData> => {
  const results: WorkspaceListData = {}
  for (const chunk of chunkArray([...new Set(subjects)], 50)) {
    signal?.throwIfAborted()
    try {
      const { data } = await labelerAgent.tools.ozone.moderation.getSubjects(
        { subjects: chunk },
        { signal },
      )
      for (const subject of data.subjects) {
        if (chunk.includes(subject.subject)) results[subject.subject] = subject
      }
    } catch (error) {
      if (signal?.aborted) throw error
      // Retain completed batches and continue loading the remaining subjects.
    }
  }
  signal?.throwIfAborted()

  const missing = subjects.filter((subject) => !results[subject])
  const kinds = [
    missing.some((subject) => subject.startsWith('did:')) && 'accounts',
    missing.some((subject) => !subject.startsWith('did:')) && 'records',
  ].filter(Boolean)
  if (kinds.length) toast.error(`Failed to load some ${kinds.join(' and ')}`)
  return results
}

export const workspaceDataOptions = (
  queryClient: QueryClient,
  labelerAgent: Agent,
  subjects: string[],
  cache?: WorkspaceCache,
) => ({
  queryKey: workspaceDataKey(subjects),
  cacheTime: STALE_MS,
  // Every trigger checks the shared clock, including returning to an old key.
  staleTime: 0,
  refetchOnMount: 'always' as const,
  refetchOnWindowFocus: 'always' as const,
  meta: { workspaceCache: cache },
  initialData: () =>
    cache && isFresh(cache) ? pickSubjects(cache.data, subjects) : undefined,
  queryFn: async ({ signal }: QueryFunctionContext) => {
    const fresh = cache && isFresh(cache)
    if (cache) {
      cache.subjects = subjects
      cache.data = fresh ? pickSubjects(cache.data, subjects) : {}
    }
    const missing = subjects.filter((subject) => !cache?.data[subject])
    const loaded = await getSubjectsInChunks(labelerAgent, missing, signal)
    const cached = queryClient.getQueryData<WorkspaceListData>(
      workspaceDataKey(subjects),
    )
    const data = pickSubjects({ ...cached, ...cache?.data, ...loaded }, subjects)
    if (cache) {
      cache.data = pickSubjects({ ...cache.data, ...loaded }, cache.subjects)
      // A slow load gets the full freshness window after its last batch.
      if (missing.length || !fresh) cache.fetchedAt = Date.now()
    }
    return data
  },
})

export const repairWorkspaceListData = async (
  queryClient: QueryClient,
  labelerAgent: Agent,
  subjects: string[],
) => {
  const queries = () =>
    queryClient.getQueryCache().findAll({ queryKey: ['workspaceListData'] })
  // Finish any current load before deciding which entries still need repair.
  await Promise.allSettled(
    queries()
      .filter((query) => query.state.fetchStatus === 'fetching')
      .map((query) => query.fetch()),
  )
  const cachedQueries = queries().filter(
    (query) => query.state.data !== undefined,
  )
  if (!cachedQueries.length) return

  const cache = [...cachedQueries]
    .sort(
      (a, b) =>
        Number(b.isActive()) - Number(a.isActive()) ||
        b.state.dataUpdatedAt - a.state.dataUpdatedAt,
    )
    .map((query) => query.meta?.workspaceCache as WorkspaceCache | undefined)
    .find((cache) => cache !== undefined)
  const stale = cache !== undefined && !isFresh(cache)
  const cached: WorkspaceListData = {}
  if (cache) {
    cache.subjects = subjects
    cache.data = stale ? {} : pickSubjects(cache.data, subjects)
    Object.assign(cached, cache.data)
  } else {
    for (const query of cachedQueries.sort(
      (a, b) => a.state.dataUpdatedAt - b.state.dataUpdatedAt,
    )) {
      Object.assign(
        cached,
        pickSubjects(query.state.data as WorkspaceListData, subjects),
      )
    }
  }
  const missing = subjects.filter((subject) => !cached[subject])
  const queryKey = workspaceDataKey(subjects)
  const options = workspaceDataOptions(queryClient, labelerAgent, subjects, cache)
  const target = queryClient
    .getQueryCache()
    .build<WorkspaceListData, unknown, WorkspaceListData, QueryKey>(
      queryClient,
      options,
    )
  const targetCache = target.meta?.workspaceCache
  const current = target.state.data
  if (
    !current ||
    subjects.some((subject) => cached[subject] && !current[subject])
  ) {
    queryClient.setQueryData(queryKey, { ...cached, ...current })
  }
  if (!missing.length) return

  const previous = new Map(
    queries().map((query) => [query, query.state.data as WorkspaceListData]),
  )
  const repaired = await getSubjectsInChunks(labelerAgent, missing)
  // A cleared cache must not receive results from an earlier session.
  if (
    queryClient
      .getQueryCache()
      .find<WorkspaceListData>({ queryKey, exact: true }) !== target ||
    target.meta?.workspaceCache !== targetCache
  )
    return
  if (cache) {
    cache.data = pickSubjects({ ...repaired, ...cache.data }, cache.subjects)
    cache.fetchedAt = Date.now()
  }
  for (const query of queries()) {
    const members = query.queryKey[1] as string[]
    const entries = pickSubjects(repaired, members)
    if (!Object.keys(entries).length) continue
    queryClient.setQueryData<WorkspaceListData>(query.queryKey, (current) => {
      const updates = Object.fromEntries(
        Object.entries(entries).filter(
          ([subject]) =>
            !current?.[subject] ||
            (stale && current[subject] === previous.get(query)?.[subject]),
        ),
      )
      return { ...current, ...updates }
    })
  }
}

export const useWorkspaceListData = ({
  subjects,
  enabled,
}: {
  subjects: string[]
  enabled: boolean
}) => {
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()
  // A panel session owns its cache; reopening or changing labelers starts fresh.
  const sessionRef = useRef<{
    enabled: boolean
    labelerAgent: Agent
    cache: WorkspaceCache
  } | null>(null)
  if (
    !sessionRef.current ||
    sessionRef.current.enabled !== enabled ||
    sessionRef.current.labelerAgent !== labelerAgent
  ) {
    sessionRef.current = {
      enabled,
      labelerAgent,
      cache: { data: {}, fetchedAt: 0, subjects: [] },
    }
  }
  const { cache } = sessionRef.current
  const query = useQuery({
    ...workspaceDataOptions(queryClient, labelerAgent, subjects, cache),
    enabled,
  })
  const { refetch } = query
  return {
    ...query,
    refetch: (...args: Parameters<typeof refetch>) => {
      cache.fetchedAt = 0
      return refetch(...args)
    },
  }
}
