'use client'
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { ToolsOzoneSafelinkDefs } from '@atproto/api'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { toast } from 'react-toastify'
import { validatePatternInput } from './helpers'

export interface SafelinkQueryParams {
  cursor?: string
  limit?: number
  urls?: string[]
  domains?: string[]
  actions?: ToolsOzoneSafelinkDefs.ActionType[]
  reason?: ToolsOzoneSafelinkDefs.ReasonType
  createdBy?: string
  sortDirection?: 'asc' | 'desc'
}

export const useSafelinkList = ({
  urls,
  patternType,
  actions,
  reason,
  createdBy,
  isDisabled = false,
}: {
  urls?: string[]
  patternType?: ToolsOzoneSafelinkDefs.PatternType
  actions?: ToolsOzoneSafelinkDefs.ActionType[]
  reason?: ToolsOzoneSafelinkDefs.ReasonType
  createdBy?: string
  isDisabled?: boolean
}) => {
  const labelerAgent = useLabelerAgent()

  return useInfiniteQuery({
    queryKey: [
      'safelink-rules',
      { urls, patternType, actions, reason, createdBy },
    ],
    queryFn: async ({ pageParam }) => {
      const queryParams: any = {
        limit: 25,
        cursor: pageParam,
      }

      if (urls?.length) {
        queryParams.urls = urls
      }

      if (patternType) {
        queryParams.patternType = patternType
      }

      if (actions?.length) {
        queryParams.actions = actions
      }

      if (reason) {
        queryParams.reason = reason
      }

      if (createdBy) {
        queryParams.createdBy = createdBy
      }

      const { data } = await labelerAgent.tools.ozone.safelink.queryRules(
        queryParams,
      )
      return data
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
    enabled: !!labelerAgent && !isDisabled,
  })
}

export const useSafelinkRemove = () => {
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      url,
      pattern,
      comment,
    }: {
      url: string
      pattern: ToolsOzoneSafelinkDefs.PatternType
      comment?: string
    }) => {
      await labelerAgent.tools.ozone.safelink.removeRule({
        url,
        pattern,
        comment,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safelink-rules'] })
      toast.success('Safelink rule removed successfully')
    },
    onError: (error: any) => {
      toast.error(`Failed to remove rule: ${error.message}`)
    },
  })
}

export const useSafelinkAdd = () => {
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (rule: ToolsOzoneSafelinkDefs.UrlRule) => {
      // Validate that the input matches the pattern type
      const validation = validatePatternInput(rule.url, rule.pattern)
      if (!validation.isValid) {
        throw new Error(validation.error)
      }

      const { data } = await labelerAgent.tools.ozone.safelink.addRule(rule)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safelink-rules'] })
      toast.success('Safelink rule added successfully')
    },
    onError: (error: any) => {
      toast.error(`Failed to add rule: ${error.message}`)
    },
  })
}

export const useSafelinkUpdate = () => {
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (rule: {
      url: string
      pattern: ToolsOzoneSafelinkDefs.PatternType
      action: ToolsOzoneSafelinkDefs.ActionType
      reason: ToolsOzoneSafelinkDefs.ReasonType
      comment?: string
      createdBy?: string
    }) => {
      const validation = validatePatternInput(rule.url, rule.pattern)
      if (!validation.isValid) {
        throw new Error(validation.error)
      }

      const { data } = await labelerAgent.tools.ozone.safelink.updateRule(rule)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safelink-rules'] })
      toast.success('Safelink rule updated successfully')
    },
    onError: (error: any) => {
      toast.error(`Failed to update rule: ${error.message}`)
    },
  })
}
