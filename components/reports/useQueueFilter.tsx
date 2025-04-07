import { ToolsOzoneModerationQueryStatuses } from '@atproto/api'
import {
  ReadonlyURLSearchParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation'
import { useMemo } from 'react'

export const useQueueFilterBuilder = (
  searchParams: ReadonlyURLSearchParams,
) => {
  return useMemo(() => {
    const filters: ToolsOzoneModerationQueryStatuses.QueryParams = {}

    searchParams.forEach((value, key) => {
      if (key === 'tags' || key === 'excludeTags' || key === 'collections') {
        filters[key] = value.split(',')
      } else if (key === 'limit') {
        filters.limit = parseInt(value, 10)
      } else {
        filters[key] = value
      }
    })

    return filters
  }, [searchParams])
}

export const useQueueFilter = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Dynamically create `queueFilters` from current `searchParams`
  const queueFilters = useQueueFilterBuilder(searchParams)

  const updateFilters = (
    newParams: Partial<ToolsOzoneModerationQueryStatuses.QueryParams>,
  ) => {
    const updatedParams = new URLSearchParams(searchParams)

    Object.entries(newParams).forEach(([key, value]) => {
      if (value === undefined) {
        updatedParams.delete(key)
      } else if (Array.isArray(value)) {
        updatedParams.set(key, value.join(','))
      } else {
        updatedParams.set(key, value.toString())
      }
    })

    router.replace(`${pathname}?${updatedParams.toString()}`)
  }

  const toggleSubjectType = (targetType: 'account' | 'record') => {
    const subjectType =
      queueFilters.subjectType === targetType ? undefined : targetType

    const newParams: Partial<ToolsOzoneModerationQueryStatuses.QueryParams> = {
      subjectType,
    }

    if (
      (targetType === 'record' && subjectType === undefined) ||
      subjectType === 'account'
    ) {
      newParams.collections = undefined
      const newTags = queueFilters.tags?.filter(
        (tag) => !tag.startsWith('embed:'),
      )
      const newExcludeTags = queueFilters.excludeTags?.filter(
        (tag) => !tag.startsWith('embed:'),
      )
      newParams.tags = newTags?.length ? newTags : undefined
      newParams.excludeTags = newExcludeTags?.length
        ? newExcludeTags
        : undefined
    }

    updateFilters(newParams)
  }

  const clearSubjectType = () => {
    updateFilters({
      subjectType: undefined,
      collections: undefined,
    })
  }

  const toggleCollection = (collection: string) => {
    const newCollections = new Set(queueFilters.collections ?? [])

    if (newCollections.has(collection)) {
      newCollections.delete(collection)
    } else {
      newCollections.add(collection)
    }

    updateFilters({
      collections:
        newCollections.size > 0 ? Array.from(newCollections) : undefined,
    })
  }

  const addTags = (index: number, tags: string[]) => {
    const newTags = queueFilters.tags ?? []

    if (!tags.length) {
      newTags.splice(index, 1)
      return updateFilters({ tags: newTags })
    }

    newTags[index] = tags.join('&&')
    updateFilters({ tags: newTags })
  }

  const updateTagExclusions = (excludeTags: string[]) => {
    updateFilters({ excludeTags: excludeTags.length ? excludeTags : undefined })
  }

  const clearTags = () => {
    updateFilters({ tags: [] })
  }

  const setMinAccountSuspendCount = (minAccountSuspendCount?: number) => {
    updateFilters({ minAccountSuspendCount })
  }

  const setMinReportedRecordsCount = (minReportedRecordsCount?: number) => {
    updateFilters({ minReportedRecordsCount })
  }

  const setMinTakendownRecordsCount = (minTakendownRecordsCount?: number) => {
    updateFilters({ minTakendownRecordsCount })
  }

  const setMinPriorityScore = (minPriorityScore?: number) => {
    updateFilters({ minPriorityScore })
  }

  return {
    queueFilters,
    updateTagExclusions,
    addTags,
    toggleCollection,
    toggleSubjectType,
    clearSubjectType,
    clearTags,
    setMinAccountSuspendCount,
    setMinReportedRecordsCount,
    setMinTakendownRecordsCount,
    setMinPriorityScore,
  }
}
