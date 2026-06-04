import {
  ToolsOzoneReportDefs
} from '@atproto/api'
import { InfiniteData, useQueryClient } from '@tanstack/react-query'
import {
  useRouter
} from 'next/navigation'
import { useMemo } from 'react'
import { useLocalStorage } from 'react-use'

function getReportsFromCache(
  queryClient: ReturnType<typeof useQueryClient>,
): ToolsOzoneReportDefs.ReportView[] {
  // Each filter combination produces its own 'betaReports' cache entry.
  // Pick the most recently updated one for navigation in this cache.
  const queries = queryClient
    .getQueryCache()
    .findAll({ queryKey: ['betaReports'] })

  const latest = queries.reduce<(typeof queries)[number] | null>(
    (best, q) =>
      !best || q.state.dataUpdatedAt > best.state.dataUpdatedAt ? q : best,
    null,
  )
  const data = latest?.state.data as
    | InfiniteData<{ reports: ToolsOzoneReportDefs.ReportView[] }>
    | undefined

  if (!data?.pages) return []

  const reports: ToolsOzoneReportDefs.ReportView[] = []
  for (const page of data.pages) {
    if (page.reports) reports.push(...page.reports)
  }
  return reports
}

function findAdjacentReportsInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  reportId: number,
): { prevId: number | null; nextId: number | null } {
  const allReports = getReportsFromCache(queryClient)

  if (allReports.length === 0) return { prevId: null, nextId: null }

  const index = allReports.findIndex((r) => r.id === reportId)
  if (index === -1) return { prevId: null, nextId: null }

  return {
    prevId: index > 0 ? allReports[index - 1].id : null,
    nextId: index < allReports.length - 1 ? allReports[index + 1].id : null,
  }
}

function findReportInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  reportId: number,
): ToolsOzoneReportDefs.ReportView | null {
  const allReports = getReportsFromCache(queryClient)
  return allReports.find((r) => r.id === reportId) ?? null
}

/**
 * Hook to manage current report
 */
export function useReports(reportId: number) {
  const router = useRouter()
  const queryClient = useQueryClient()

  // current report
  const report = useMemo(() => {
    if (reportId === null) return null
    return findReportInCache(queryClient, reportId)
  }, [reportId])

  // adjacent
  const { prevId, nextId } = useMemo(
    function () {
      if (reportId === null) return { prevId: null, nextId: null }
      return findAdjacentReportsInCache(queryClient, reportId)
    },
    [reportId],
  )

  // auto advance
  const [advanceAfterAction, setAdvanceAfterAction] = useLocalStorage(
    'reports.advanceAfterAction',
    false,
  )
  const advanceToNext = () => {
    if (advanceAfterAction) {
      if (nextId) {
        router.push(`/reports/${nextId}`)
      }
    }
  }

  console.log('useReports', {
    reportId,
    report,
    prevId,
    nextId,
    advanceAfterAction,
  })

  return {
    report,
    prevReportId: prevId,
    nextReportId: nextId,
    advanceAfterAction,
    setAdvanceAfterAction,
    advanceToNext,
  }
}
