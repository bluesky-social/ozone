import { ToolsOzoneModerationQueryStatuses } from '@atproto/api'
import {
  ReadonlyURLSearchParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation'
import { useCallback, useMemo } from 'react'
import { EmbedTypes } from './helpers/subject'

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

  const resetFilters = useCallback(() => {
    router.replace(pathname)
  }, [router, pathname])

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

  const toggleEmbedType = (embedType: string) => {
    const allEmbedTypes = Object.values(EmbedTypes)

    const newTags = new Set(queueFilters.tags ?? [])
    const newExcludeTags = new Set(queueFilters.excludeTags ?? [])

    if (embedType.startsWith('embed:')) {
      if (newTags.has(embedType)) {
        newTags.delete(embedType)
      } else {
        allEmbedTypes.forEach((embed) => newExcludeTags.delete(embed))
        newTags.add(embedType)
      }
    } else if (embedType === 'noEmbed') {
      const hasAllEmbedExcludes = allEmbedTypes.every((embed) =>
        newExcludeTags.has(embed),
      )

      if (hasAllEmbedExcludes) {
        allEmbedTypes.forEach((embed) => newExcludeTags.delete(embed))
      } else {
        allEmbedTypes.forEach((embed) => {
          newTags.delete(embed)
          newExcludeTags.add(embed)
        })
      }
    }

    updateFilters({
      tags: newTags.size > 0 ? Array.from(newTags) : undefined,
      excludeTags:
        newExcludeTags.size > 0 ? Array.from(newExcludeTags) : undefined,
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

  const toggleLanguage = (section: 'include' | 'exclude', newLang: string) => {
    const filterKey = section === 'include' ? 'tags' : 'excludeTags'
    const currentTags =
      section === 'include' ? queueFilters.tags : queueFilters.excludeTags

    const newTags = new Set(currentTags ?? [])
    if (newTags.has(`lang:${newLang}`)) {
      newTags.delete(`lang:${newLang}`)
    } else {
      newTags.add(`lang:${newLang}`)
    }

    updateFilters({
      [filterKey]: newTags.size > 0 ? Array.from(newTags) : undefined,
    })
  }

  const clearLanguages = () => {
    const newTags = queueFilters.tags?.filter((tag) => !tag.startsWith('lang:'))
    const newExcludeTags = queueFilters.excludeTags?.filter(
      (tag) => !tag.startsWith('lang:'),
    )

    updateFilters({
      tags: newTags?.length ? newTags : undefined,
      excludeTags: newExcludeTags?.length ? newExcludeTags : undefined,
    })
  }

  return {
    queueFilters,
    updateFilters,
    toggleCollection,
    resetFilters,
    toggleSubjectType,
    toggleEmbedType,
    clearLanguages,
    toggleLanguage,
  }
}
