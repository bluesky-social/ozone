import type { ToolsOzoneReportQueryModeratorActivity } from '@atproto/api'
import {
  STATS_PERIODS,
  type StatsPeriod,
  type StatsWindow,
} from './stats/statsWindow'

export type ActivityRow = ToolsOzoneReportQueryModeratorActivity.ActivityRow
export type ActivityParams = ToolsOzoneReportQueryModeratorActivity.QueryParams
export type ActivityPage = ToolsOzoneReportQueryModeratorActivity.OutputSchema
export type ModeratorFilters = {
  moderatorDid: string
  memberQueueId?: number
  period: StatsPeriod
  types: string[]
}

export function utcToday(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10)
}

export function readModeratorFilters(
  params: URLSearchParams,
): ModeratorFilters {
  const queueId = Number(params.get('memberQueue'))
  return {
    moderatorDid: params.get('moderatorDid') ?? '',
    memberQueueId:
      Number.isSafeInteger(queueId) && queueId > 0 ? queueId : undefined,
    period: STATS_PERIODS.find((p) => p === params.get('period')) ?? 'Today',
    types: [...new Set(params.getAll('activityType'))].sort(),
  }
}

export function writeModeratorFilters(
  params: URLSearchParams,
  filters: ModeratorFilters,
) {
  const next = new URLSearchParams(params)
  if (filters.moderatorDid) next.set('moderatorDid', filters.moderatorDid)
  else next.delete('moderatorDid')
  if (filters.memberQueueId)
    next.set('memberQueue', String(filters.memberQueueId))
  else next.delete('memberQueue')
  next.set('period', filters.period)
  for (const key of [
    'view',
    'activityRange',
    'activityStart',
    'activityEnd',
    'activityQueue',
    'includeAutomated',
  ])
    next.delete(key)
  next.delete('activityType')
  for (const type of [...new Set(filters.types)].sort())
    next.append('activityType', type)
  return next
}

export function activityFilterError(
  filters: ModeratorFilters,
): string | undefined {
  if (filters.types.length > 40) return 'Choose at most 40 activity types.'
}

export function activityParams(
  filters: ModeratorFilters,
  window: StatsWindow,
): ActivityParams {
  return {
    moderator: filters.moderatorDid,
    createdAfter: window.startDate,
    // Stats dates are inclusive; activity timestamps use an exclusive end.
    createdBefore: new Date(
      Date.parse(window.endDate) + 86400000,
    ).toISOString(),
    types: filters.types.length ? filters.types : undefined,
    limit: 50,
  }
}

export function moderatorStatsParams(
  moderatorDid: string,
  window: StatsWindow,
) {
  return {
    moderatorDid,
    startDate: window.startDate,
    endDate: window.endDate,
    limit: 100,
  }
}

export function activityIdentity(row: ActivityRow) {
  return `${row.source}:${row.id}`
}

export function reportReviewHref(id: number) {
  return `/reports/${id}?activityReview=true`
}

export function activityAccessDenied(error: unknown) {
  const e = error as { status?: number; error?: string } | undefined
  return (
    e?.status === 401 ||
    e?.status === 403 ||
    e?.error === 'Forbidden' ||
    e?.error === 'AuthRequired'
  )
}
