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
import { toast } from 'react-toastify'

export type WorkspaceListData = Record<
  string,
  ToolsOzoneModerationDefs.SubjectView
>

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

const workspaceDataOptions = (
  queryClient: QueryClient,
  labelerAgent: Agent,
  subjects: string[],
) => ({
  queryKey: workspaceDataKey(subjects),
  cacheTime: 60 * 1000,
  staleTime: 60 * 1000,
  queryFn: async ({ signal }: QueryFunctionContext) => {
    const loaded = await getSubjectsInChunks(labelerAgent, subjects, signal)
    const cached = queryClient.getQueryData<WorkspaceListData>(
      workspaceDataKey(subjects),
    )
    return pickSubjects({ ...cached, ...loaded }, subjects)
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

  const cached: WorkspaceListData = {}
  for (const query of cachedQueries.sort(
    (a, b) => a.state.dataUpdatedAt - b.state.dataUpdatedAt,
  )) {
    Object.assign(
      cached,
      pickSubjects(query.state.data as WorkspaceListData, subjects),
    )
  }
  const missing = subjects.filter((subject) => !cached[subject])
  const queryKey = workspaceDataKey(subjects)
  const target = queryClient
    .getQueryCache()
    .build<WorkspaceListData, unknown, WorkspaceListData, QueryKey>(
      queryClient,
      workspaceDataOptions(queryClient, labelerAgent, subjects),
    )
  const current = target.state.data
  if (
    !current ||
    subjects.some((subject) => cached[subject] && !current[subject])
  ) {
    queryClient.setQueryData(queryKey, { ...cached, ...current })
  }
  if (!missing.length) return

  const repaired = await getSubjectsInChunks(labelerAgent, missing)
  // A cleared cache must not receive results from an earlier session.
  if (
    queryClient
      .getQueryCache()
      .find<WorkspaceListData>({ queryKey, exact: true }) !== target
  )
    return
  for (const query of queries()) {
    const members = query.queryKey[1] as string[]
    const entries = pickSubjects(repaired, members)
    if (!Object.keys(entries).length) continue
    queryClient.setQueryData<WorkspaceListData>(query.queryKey, (current) => ({
      ...entries,
      ...current,
    }))
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
  return useQuery({
    ...workspaceDataOptions(queryClient, labelerAgent, subjects),
    enabled,
  })
}
