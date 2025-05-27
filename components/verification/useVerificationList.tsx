import { useLabelerAgent, useServerConfig } from '@/shell/ConfigurationContext'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export type VerificationFilterOptions = {
  subjects?: string[]
  issuers?: string[]
  isRevoked?: boolean
  createdAfter?: string
  createdBefore?: string
}

// Parse query parameters into filter options
const parseQueryToFilters = (
  searchParams: URLSearchParams,
): VerificationFilterOptions => {
  const filters: VerificationFilterOptions = {}

  const subjects = searchParams.get('subjects')
  if (subjects) {
    filters.subjects = subjects
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }

  const issuers = searchParams.get('issuers')
  if (issuers) {
    filters.issuers = issuers
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }

  const isRevoked = searchParams.get('isRevoked')
  if (isRevoked !== null) {
    if (isRevoked === 'true') filters.isRevoked = true
    else if (isRevoked === 'false') filters.isRevoked = false
  }

  // Parse date range
  const createdAfter = searchParams.get('createdAfter')
  if (createdAfter) {
    filters.createdAfter = createdAfter
  }

  const createdBefore = searchParams.get('createdBefore')
  if (createdBefore) {
    filters.createdBefore = createdBefore
  }

  return filters
}

const emptyFilters: VerificationFilterOptions = {
  subjects: [],
  issuers: [],
  isRevoked: undefined,
  createdAfter: undefined,
  createdBefore: undefined,
}

export function useVerificationFilter(
  onFilterChange?: (filters: VerificationFilterOptions) => void,
) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [initializedFromUrl, setInitializedFromUrl] = useState(false)

  const [filters, setFilters] =
    useState<VerificationFilterOptions>(emptyFilters)

  useEffect(() => {
    if (!initializedFromUrl) {
      const parsedFilters = parseQueryToFilters(searchParams)
      setFilters(parsedFilters)
      setInitializedFromUrl(true)

      // Notify parent component if needed
      if (onFilterChange) {
        onFilterChange(parsedFilters)
      }
    }
  }, [searchParams, initializedFromUrl, onFilterChange])

  const applyFilters = (newFilters: VerificationFilterOptions) => {
    setFilters(newFilters)

    const newSearchParams = new URLSearchParams(searchParams.toString())

    newSearchParams.delete('subjects')
    newSearchParams.delete('issuers')
    newSearchParams.delete('isRevoked')
    newSearchParams.delete('createdAfter')
    newSearchParams.delete('createdBefore')

    if (newFilters.subjects && newFilters.subjects.length > 0) {
      newSearchParams.set('subjects', newFilters.subjects.join(','))
    }

    if (newFilters.issuers && newFilters.issuers.length > 0) {
      newSearchParams.set('issuers', newFilters.issuers.join(','))
    }

    if (newFilters.isRevoked !== undefined) {
      newSearchParams.set('isRevoked', newFilters.isRevoked.toString())
    }

    if (newFilters.createdAfter) {
      newSearchParams.set('createdAfter', newFilters.createdAfter)
    }

    if (newFilters.createdBefore) {
      newSearchParams.set('createdBefore', newFilters.createdBefore)
    }

    router.push(`?${newSearchParams.toString()}`)

    if (onFilterChange) {
      onFilterChange(newFilters)
    }
  }

  const resetFilters = () => {
    setFilters(emptyFilters)

    const newSearchParams = new URLSearchParams(searchParams.toString())

    newSearchParams.delete('subjects')
    newSearchParams.delete('issuers')
    newSearchParams.delete('isRevoked')
    newSearchParams.delete('createdAfter')
    newSearchParams.delete('createdBefore')

    router.push(`?${newSearchParams.toString()}`)

    if (onFilterChange) {
      onFilterChange(emptyFilters)
    }
  }

  return {
    filters,
    applyFilters,
    resetFilters,
  }
}

export const useVerificationList = ({
  subjects,
  issuers,
  isRevoked,
  createdAfter,
  createdBefore,
}: VerificationFilterOptions) => {
  const serverConfig = useServerConfig()
  const labelerAgent = useLabelerAgent()
  return useInfiniteQuery({
    enabled: !!serverConfig.verifierDid,
    queryKey: [
      'verification-list',
      issuers,
      createdBefore,
      createdAfter,
      subjects,
      isRevoked,
    ],
    queryFn: async ({ pageParam }) => {
      const { data } =
        await labelerAgent.tools.ozone.verification.listVerifications({
          issuers: issuers,
          isRevoked,
          createdAfter,
          createdBefore,
          limit: 100,
          subjects,
          cursor: pageParam,
        })
      return data
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })
}
