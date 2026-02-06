import { getLocalStorageData, setLocalStorageData } from '@/lib/local-storage'
import { FILTER_MACROS_LIST_KEY } from '../constants'
import { EventListState } from '../useModEventList'

export type FilterMacro = Record<
  string,
  {
    updatedAt: Date
    filters: Partial<EventListState>
  }
>

/** Formats list state to a state suitable for sharing. */
export const createShareableState = (
  state: Partial<EventListState>,
): Partial<EventListState> => {
  return {
    types: state.types,
    reportTypes: state.reportTypes,
    addedLabels: state.addedLabels,
    removedLabels: state.removedLabels,
    commentFilter: state.commentFilter,
    createdBy: state.createdBy,
    batchId: state.batchId,
    oldestFirst: state.oldestFirst,
    createdAfter: state.createdAfter,
    createdBefore: state.createdBefore,
    subjectType: state.subjectType,
    selectedCollections: state.selectedCollections,
    ageAssuranceState: state.ageAssuranceState,
    withStrike: state.withStrike,
    limit: state.limit,
  }
}

export const getList = (): FilterMacro => {
  const list = getLocalStorageData<FilterMacro>(FILTER_MACROS_LIST_KEY)
  if (!list) return {}
  return list
}

export const updateList = (name: string, state: Partial<EventListState>) => {
  const filters = createShareableState(state)
  const list = getList()
  if (!list[name]) {
    list[name] = { updatedAt: new Date(), filters }
  } else {
    list[name] = {
      updatedAt: new Date(),
      filters: { ...list[name].filters, ...filters },
    }
  }
  setLocalStorageData(FILTER_MACROS_LIST_KEY, list)
  return list
}

export const removeFromList = (name: string) => {
  const list = getList()
  delete list[name]
  setLocalStorageData(FILTER_MACROS_LIST_KEY, list)
  return list
}

export const emptyList = () => {
  setLocalStorageData(FILTER_MACROS_LIST_KEY, null)
  return []
}

export const filtersToString = (filters: Partial<EventListState>) => {
  const _filters = createShareableState(filters)
  return JSON.stringify(_filters, null, 2)
}

export const copyFiltersToClipboard = async (
  filters: Partial<EventListState>,
) => {
  const text = filtersToString(filters)
  await navigator.clipboard.writeText(text)
}
