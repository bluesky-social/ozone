import { useEffect } from 'react'
import {
  ReadonlyURLSearchParams,
  usePathname,
  useSearchParams,
} from 'next/navigation'
import { useInfiniteQuery } from '@tanstack/react-query'
import { ToolsOzoneReportQueryReports } from '@atproto/api'
import { useFluentReportSearchParams } from './useFluentReportSearch'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { persistReportListIds } from './useReports'

const getSortParams = (params: ReadonlyURLSearchParams) => {
  let sortField = params.get('sortField')
  let sortDirection = params.get('sortDirection')

  if (!['asc', 'desc'].includes(sortDirection ?? '')) {
    sortDirection = 'asc'
  }

  if (!['createdAt', 'updatedAt'].includes(sortField ?? '')) {
    sortField = 'createdAt'
  }

  return { sortField, sortDirection }
}

export function useReportsQuery({
  did,
  subject: fixedSubject,
}: {
  did?: string
  subject?: string
} = {}) {
  const labelerAgent = useLabelerAgent()
  const params = useSearchParams()

  const subjectType = params.get('subjectType')
  const collections = params.get('collections')
  const status = params.get('status') ?? 'queued'
  const reportTypes = params.get('reportTypes')
  const mute = params.get('mute')
  const queueId = params.get('queueId')
  const assignedTo = params.get('assignedTo')
  const { sortField, sortDirection } = getSortParams(params)
  const { lastReviewedBy, subject: searchSubject } =
    useFluentReportSearchParams()
  // Account and record report lists keep their route scope when filters change.
  const subject = fixedSubject ?? (did ? undefined : searchSubject)

  const query = useInfiniteQuery({
    queryKey: [
      'betaReports',
      {
        did,
        subject,
        sortField,
        sortDirection,
        status,
        reportTypes,
        lastReviewedBy,
        subjectType,
        collections,
        queueId,
        mute,
        assignedTo,
      },
    ],
    queryFn: async ({ pageParam }) => {
      const queryParams: ToolsOzoneReportQueryReports.QueryParams = {
        cursor: pageParam,
        status,
        did,
      }

      if (subject) {
        queryParams.subject = subject
      } else {
        if (subjectType) {
          queryParams.subjectType = subjectType
        }

        if (subjectType === 'record') {
          const collectionNames = collections?.split(',').filter(Boolean)
          if (collectionNames?.length) {
            queryParams.collections = collectionNames
          }
        }
      }

      if (reportTypes) {
        queryParams.reportTypes = reportTypes.split(',').filter(Boolean)
      }

      if (queueId) {
        queryParams.queueId = Number(queueId)
      }

      Object.entries({
        sortField,
        sortDirection,
        status,
        reviewedBy: lastReviewedBy,
      }).forEach(([key, value]) => {
        if (value) {
          queryParams[key] = value
        }
      })

      if (assignedTo) {
        queryParams.assignedTo = assignedTo
      }

      // Match the beta list's mute parameters. "all" omits isMuted;
      // whether that includes both depends on the backend's default.
      if (mute === 'isMuted') {
        queryParams.isMuted = true
      } else if (mute !== 'all') {
        queryParams.isMuted = false
      }

      const { data } = await labelerAgent.tools.ozone.report.queryReports({
        limit: 100,
        ...queryParams,
      })

      return data
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })

  const reports = query.data?.pages.flatMap((page) => page.reports) ?? []
  const reportIdsKey = reports.map((report) => report.id).join(',')
  const hasData = !!query.data

  useEffect(() => {
    if (!hasData) return
    persistReportListIds(
      reportIdsKey ? reportIdsKey.split(',').map(Number) : [],
    )
  }, [hasData, reportIdsKey])

  const pathname = usePathname()
  useEffect(() => {
    const url = pathname + (params.toString() ? `?${params.toString()}` : '')
    try {
      sessionStorage.setItem('ozone:reportsListUrl', url)
    } catch {
      // Report lists still work when sessionStorage is unavailable.
    }
  }, [pathname, params])

  return { ...query, reports }
}
