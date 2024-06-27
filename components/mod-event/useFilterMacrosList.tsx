import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import {
  emptyList,
  FilterMacro,
  getList,
  removeFromList,
  updateList,
} from './helpers/macros'
import { EventListState } from './useModEventList'

const FILTER_MACRO_LIST_QUERY_KEY = 'filter-macro-list'

export const useFilterMacroList = () => {
  return useQuery({
    retry: false,
    queryKey: [FILTER_MACRO_LIST_QUERY_KEY],
    queryFn: async () => {
      return getList()
    },
  })
}

export const useFilterMacroUpsertMutation = () => {
  const queryClient = useQueryClient()
  const mutation = useMutation<
    FilterMacro,
    unknown,
    { name: string; filters: Partial<EventListState> },
    unknown
  >(
    async ({ name, filters }) => {
      return updateList(name, filters)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries([FILTER_MACRO_LIST_QUERY_KEY])
        toast.success('Filter macro saved')
      },
    },
  )

  return mutation
}

export const useFilterMacroRemoveMutation = () => {
  const queryClient = useQueryClient()
  const mutation = useMutation<FilterMacro, unknown, string, unknown>(
    async (name) => {
      return removeFromList(name)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries([FILTER_MACRO_LIST_QUERY_KEY])
        toast.success('Filter macro removed')
      },
    },
  )

  return mutation
}

export const useFilterMacroEmptyMutation = () => {
  const queryClient = useQueryClient()
  const mutation = useMutation(
    async () => {
      return emptyList()
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries([FILTER_MACRO_LIST_QUERY_KEY])
        toast.success('Removed all filter macros')
      },
    },
  )

  return mutation
}
