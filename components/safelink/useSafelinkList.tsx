'use client'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ToolsOzoneSafelinkDefs } from '@atproto/api'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { toast } from 'react-toastify'

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

export const useSafelinkList = (searchQuery = '') => {
  const labelerAgent = useLabelerAgent()

  return useInfiniteQuery({
    queryKey: ['safelink-rules', searchQuery],
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

      const { data } = await labelerAgent.tools.ozone.safelink.queryRules(queryParams)
      return data
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
    enabled: !!labelerAgent,
  })
}

export const useSafelinkRemove = () => {
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      url, 
      pattern, 
      comment 
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