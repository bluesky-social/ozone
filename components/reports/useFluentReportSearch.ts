import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'

type SearchQueryParams = {
  subject?: string
  lastReviewedBy?: string
  reporters?: string[]
  includeAllUserRecords?: boolean
}

const ParamPrefixes = {
  subject: 'subject',
  reporters: 'reporters',
  lastReviewedBy: 'lastReviewedBy',
  includeAllUserRecords: 'includeAllUserRecords',
}

export const buildQueryFromParams = (
  params: Record<string, string>,
): string => {
  const queryFragments: string[] = []

  Object.values(ParamPrefixes).forEach((key) => {
    // we may have falsy values so just the existence of the key should be checked instead of the value
    if (params.hasOwnProperty(key)) {
      queryFragments.push(`${key}:${params[key]}`)
    }
  })

  return queryFragments.join(' ')
}

export const buildParamsFromQuery = (
  query?: string,
): Record<string, string> => {
  const params = {}
  const fragments = query?.split(' ')
  const allPrefixes = Object.values(ParamPrefixes)

  fragments?.forEach((fragment) => {
    allPrefixes.forEach((prefix) => {
      if (fragment.startsWith(`${prefix}:`)) {
        // We are doing this weird join thing because the separator between dids is also :
        // so a search for lastReviewedBy:did:example:etc would end up creating multiple fragments when split by :
        // which is why, we need to only take the first fragment as the key and put the rest back together as value
        const [_, ...rest] = fragment.split(`:`)
        params[prefix] = rest.join(':')
      }
    })
  })

  return params
}

export const useFluentReportSearchUpdate = () => {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  return useCallback(
    (query) => {
      const nextParams = new URLSearchParams(params)
      nextParams.set('term', query)
      router.push(`${pathname}?${nextParams}`)
    },
    [router, pathname, params],
  )
}

export const useFluentReportSearchParams = (): SearchQueryParams => {
  const subject = useSearchParams().get('term') ?? undefined

  return useMemo(() => {
    const searchParams: SearchQueryParams = {
      subject,
      lastReviewedBy: undefined,
      reporters: undefined,
      includeAllUserRecords: undefined,
    }

    const paramsFromQuery = buildParamsFromQuery(subject)

    // If the params built from query is not empty, that means the term is no longer just subject
    if (Object.keys(paramsFromQuery).length) {
      searchParams.subject = paramsFromQuery.subject
      searchParams.includeAllUserRecords =
        paramsFromQuery.includeAllUserRecords === 'true'
      searchParams.lastReviewedBy = paramsFromQuery.lastReviewedBy
      searchParams.reporters = paramsFromQuery.reporters
        ? paramsFromQuery.reporters.split(',')
        : undefined
    }

    return searchParams
  }, [subject])
}
