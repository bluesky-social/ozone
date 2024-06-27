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

export const getList = (): FilterMacro => {
  const list = getLocalStorageData<FilterMacro>(FILTER_MACROS_LIST_KEY)
  if (!list) return {}
  return list
}

export const updateList = (name: string, filters: Partial<EventListState>) => {
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
