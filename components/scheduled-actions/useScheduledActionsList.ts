import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import {
  Agent,
  ToolsOzoneModerationDefs,
  ToolsOzoneModerationListScheduledActions,
} from '@atproto/api'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { chunkArray, pluralize } from '@/lib/util'
import { toast } from 'react-toastify'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

const DEFAULT_STATUSES = ['pending', 'executed', 'cancelled', 'failed']

const getScheduledActions =
  ({ labelerAgent }: { labelerAgent: Agent }) =>
  async (
    {
      pageParam,
      startsAfter,
      endsBefore,
      subjects,
      statuses,
      limit = 50,
    }: {
      pageParam?: string
    } & ToolsOzoneModerationListScheduledActions.InputSchema,
    options: { signal?: AbortSignal } = {},
  ): Promise<{
    actions: ToolsOzoneModerationDefs.ScheduledActionView[]
    cursor?: string
  }> => {
    const params: any = {
      limit,
      cursor: pageParam,
    }

    if (startsAfter) params.startsAfter = startsAfter
    if (endsBefore) params.endsBefore = endsBefore
    if (subjects && subjects.length > 0) params.subjects = subjects
    // statuses is now required, default to all statuses if none provided
    params.statuses = statuses && statuses.length > 0 ? statuses : DEFAULT_STATUSES

    const res = await labelerAgent.tools.ozone.moderation.listScheduledActions(
      params,
      options,
    )
    return res.data
  }

export function useScheduledActionsListFilter(
  searchParams: URLSearchParams,
  router: AppRouterInstance,
  pathname: string,
) {
  const startsAfter = searchParams.get('startsAfter') || undefined
  const endsBefore = searchParams.get('endsBefore') || undefined
  const subjects =
    searchParams.get('subjects')?.split(',').filter(Boolean) || undefined
  const statuses =
    searchParams.get('statuses')?.split(',').filter(Boolean) || DEFAULT_STATUSES

  const filters = {
    startsAfter,
    endsBefore,
    subjects,
    statuses,
  }

  const updateFilters = (newFilters: {
    startsAfter?: string
    endsBefore?: string
    subjects?: string[]
    statuses?: string[]
  }) => {
    const params = new URLSearchParams()

    if (newFilters.startsAfter) params.set('startsAfter', newFilters.startsAfter)
    if (newFilters.endsBefore) params.set('endsBefore', newFilters.endsBefore)
    if (newFilters.subjects && newFilters.subjects.length > 0) {
      params.set('subjects', newFilters.subjects.join(','))
    }
    if (newFilters.statuses && newFilters.statuses.length > 0) {
      params.set('statuses', newFilters.statuses.join(','))
    }

    router.push(`${pathname}?${params.toString()}`)
  }

  const hasActiveFilters =
    startsAfter ||
    endsBefore ||
    (subjects && subjects.length > 0) ||
    (statuses && statuses.length > 0)

  return { filters, updateFilters, hasActiveFilters }
}

export function useScheduledActionsList(filters: ToolsOzoneModerationListScheduledActions.InputSchema) {
  const labelerAgent = useLabelerAgent()
  const getScheduledActionsPage = getScheduledActions({ labelerAgent })

  const { data, fetchNextPage, hasNextPage, isLoading, refetch, error } =
    useInfiniteQuery({
      queryKey: ['scheduled-actions', filters],
      queryFn: ({ pageParam }) =>
        getScheduledActionsPage({
          pageParam,
          ...filters,
        }),
      refetchOnWindowFocus: false,
      getNextPageParam: (lastPage) => lastPage.cursor,
    })

  const actions = data?.pages.flatMap((page) => page.actions) ?? []

  const actionDids = Array.from(
    new Set(actions.map((action) => action.did).filter(Boolean)),
  )

  const { data: reposData } = useQuery({
    queryKey: ['repos-for-scheduled-actions', actionDids],
    queryFn: async () => {
      if (actionDids.length === 0) return {}

      const repos: Record<string, ToolsOzoneModerationDefs.RepoViewDetail> = {}

      for (const didsChunk of chunkArray(actionDids, 100)) {
        const { data } = await labelerAgent.tools.ozone.moderation.getRepos({
          dids: didsChunk,
        })
        for (const repo of data.repos) {
          if (ToolsOzoneModerationDefs.isRepoViewDetail(repo)) {
            repos[repo.did] = repo
          }
        }
      }

      return repos
    },
    enabled: actionDids.length > 0,
  })

  return {
    actions,
    repos: reposData || {},
    fetchNextPage,
    hasNextPage,
    isLoading,
    refetch,
    error,
  }
}

export function useCancelScheduledAction() {
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ subjects, comment }: { subjects: string[]; comment?: string }) => {
      const succeeded: string[] = []
      const failed: string[] = []
      for (const chunk of chunkArray(subjects, 50)) {
        const params: any = { subjects: chunk }
        if (comment) params.comment = comment

        const { data } =
          await labelerAgent.tools.ozone.moderation.cancelScheduledActions(params)

        succeeded.push(...data.succeeded)
        data.failed.forEach((f) => failed.push(f.did))
      }
      return { succeeded, failed }
    },
    onSuccess: (data) => {
      let result = ''
      if (data.succeeded.length > 0) {
        result += `Cancelled ${pluralize(
          data.succeeded.length,
          'scheduled action',
        )}`
      }
      if (data.failed.length > 0) {
        if (result) result += '.  '
        result += `Failed to cancel ${pluralize(
          data.failed.length,
          'scheduled action',
        )}`
      }

      toast.success(result)
      queryClient.invalidateQueries({ queryKey: ['scheduled-actions'] })
    },
    onError: (error) => {
      toast.error(
        `Failed to cancel scheduled actions: ${(error as Error).message}`,
      )
    },
  })
}
