import { ActionButton } from '@/common/buttons'
import { Checkbox } from '@/common/forms'
import { LoadMoreButton } from '@/common/LoadMoreButton'
import { ModeratorBadge } from '@/common/profileStatus/ModeratorBadge'
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline'
import { Card } from '@/common/Card'
import { TextWithLinks } from '@/common/TextWithLinks'
import { ModEventItem } from '@/mod-event/EventItem'
import { ModToolProvider } from '@/mod-event/ModToolContext'
import { MOD_EVENT_TITLES } from '@/mod-event/constants'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { ModeratorDirectory } from './ModeratorDirectory'
import { ActivityItem } from './ReportActions'
import {
  activityAccessDenied,
  activityFilterError,
  activityIdentity,
  moderatorStatsParams,
  reportReviewHref,
  type ActivityRow,
  type ModeratorFilters,
} from './moderatorActivity'
import { OverviewStats } from './stats/OverviewStats'
import { summarizeStats } from './stats/reportStats'
import type { StatsWindow } from './stats/statsWindow'
import { useHistoricalStats } from './stats/useReportStats'
import { useModeratorActivity } from './useModeratorActivity'

const ACTIVITY_TITLES: Record<string, string> = {
  queueActivity: 'Routed',
  assignmentActivity: 'Assigned',
  unassignmentActivity: 'Unassigned',
  escalationActivity: 'Escalated',
  closeActivity: 'Closed',
  reopenActivity: 'Reopened',
  noteActivity: 'Note',
}
const EVENT_TITLES: Record<string, string> = MOD_EVENT_TITLES
const linkClass = 'text-blue-600 hover:underline dark:text-blue-400'

export function ModeratorAnalytics({
  filters,
  onChange,
  window,
  onCurrentPeriod,
}: {
  filters: ModeratorFilters
  onChange: (filters: ModeratorFilters) => void
  window: StatsWindow
  onCurrentPeriod: () => void
}) {
  const container = useRef<HTMLElement>(null)
  const [liveRefresh, setLiveRefresh] = useState(false)
  const error = activityFilterError(filters)
  const selectModerator = (did: string) => {
    onChange({ ...filters, moderatorDid: did })
    container.current?.closest('[data-analytics-scroll]')?.scrollTo({ top: 0 })
  }
  return (
    <section
      ref={container}
      aria-label="Moderator analytics"
      className="space-y-5"
    >
      {!filters.moderatorDid ? (
        <ModeratorDirectory
          onSelect={selectModerator}
          queueId={filters.memberQueueId}
          onQueueChange={(memberQueueId) =>
            onChange({ ...filters, memberQueueId })
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <ActionButton
              appearance="outlined"
              size="sm"
              onClick={() => selectModerator('')}
            >
              <ArrowLeftIcon className="mr-1 h-4 w-4" />
              Back to moderators
            </ActionButton>
            <ModeratorBadge did={filters.moderatorDid} />
          </div>
          <ModeratorSummary
            key={filters.moderatorDid}
            moderatorDid={filters.moderatorDid}
            window={window}
          />
          <div className="mx-auto w-full max-w-3xl space-y-5">
            <h2 className="font-semibold">Activity history</h2>
            <ActivityFilters
              filters={filters}
              onChange={onChange}
              liveRefresh={liveRefresh}
              onLiveRefreshChange={setLiveRefresh}
            />
            {error ? (
              <p role="alert">{error}</p>
            ) : (
              <ModeratorActivityHistory
                key={JSON.stringify([filters, window.endDate])}
                filters={filters}
                window={window}
                liveRefresh={liveRefresh}
                onCurrentPeriod={onCurrentPeriod}
              />
            )}
          </div>
        </>
      )}
    </section>
  )
}

function ModeratorSummary({
  moderatorDid,
  window,
}: {
  moderatorDid: string
  window: StatsWindow
}) {
  const query = useHistoricalStats(moderatorStatsParams(moderatorDid, window), {
    refetchInterval: 5 * 60 * 1000,
  })
  const rows = query.data?.stats ?? []
  const summary = summarizeStats(rows)
  const latest = rows
    .flatMap((row) => (row.computedAt ? [row.computedAt] : []))
    .sort()
    .at(-1)
  const coverage = [
    ['Reports closed', summary.coverage.closedCount],
    ['Action rate', summary.coverage.actionRate],
    ['Escalations', summary.coverage.escalatedCount],
    ['Average handling time', summary.coverage.avgHandlingTimeSec],
    ['Closure target', summary.coverage.closureTargetMetRate],
  ] as const
  return (
    <div className="space-y-3">
      <h2 className="font-semibold">Report statistics · All queues</h2>
      <OverviewStats
        {...summary}
        rows={rows}
        periodLabel={window.label}
        showPending={false}
        lastUpdated={latest}
        isLoading={query.isLoading}
        isError={query.isError}
        refetch={query.refetch}
      />
      {!query.isLoading &&
        !query.isError &&
        coverage.some(([, days]) => (days ?? 0) < window.days) && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Partial coverage:{' '}
            {coverage
              .map(
                ([label, days]) => `${label}: ${days ?? 0}/${window.days} days`,
              )
              .join(' · ')}
            .
          </p>
        )}
    </div>
  )
}

function ActivityFilters({
  filters,
  onChange,
  liveRefresh,
  onLiveRefreshChange,
}: {
  filters: ModeratorFilters
  onChange: (filters: ModeratorFilters) => void
  liveRefresh: boolean
  onLiveRefreshChange: (enabled: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const groups = [
    { title: 'Report activities', types: Object.entries(ACTIVITY_TITLES) },
    {
      title: 'Moderation events',
      types: Object.entries(EVENT_TITLES).filter(([value]) =>
        value.startsWith('tools.ozone.moderation.defs#'),
      ),
    },
  ]
  return (
    <div aria-label="Activity filters" className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <ActionButton
          appearance="outlined"
          size="sm"
          aria-expanded={open}
          aria-controls="moderator-activity-filters"
          onClick={() => setOpen((value) => !value)}
        >
          <FunnelIcon className="mr-1 h-4 w-4" />
          Activity types ·{' '}
          {filters.types.length
            ? `${filters.types.length} selected`
            : 'All types'}
        </ActionButton>
        <ActionButton
          appearance="outlined"
          size="sm"
          disabled={!filters.types.length}
          onClick={() => onChange({ ...filters, types: [] })}
        >
          Reset Filters
        </ActionButton>
        <ActionButton
          appearance={
            liveRefresh && filters.period === 'Today' ? 'primary' : 'outlined'
          }
          size="sm"
          className="ml-auto"
          aria-label="Live refresh"
          aria-pressed={liveRefresh && filters.period === 'Today'}
          disabled={filters.period !== 'Today'}
          title={
            filters.period !== 'Today'
              ? 'Live refresh is available for Today'
              : liveRefresh
                ? 'Pause live refresh'
                : 'Enable live refresh'
          }
          onClick={() => onLiveRefreshChange(!liveRefresh)}
        >
          <ArrowPathIcon
            className={`h-5 w-5 ${liveRefresh && filters.period === 'Today' ? 'motion-safe:animate-spin motion-safe:[animation-duration:3s]' : ''}`}
            aria-hidden="true"
          />
        </ActionButton>
      </div>
      {open && (
        <Card id="moderator-activity-filters" className="px-5 py-3">
          <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
            Activity types filter the history only. Statistics above cover all
            activity types and all queues for the selected period.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {groups.map(({ title, types }, index) => (
              <fieldset
                key={title}
                className={index === 1 ? 'sm:col-span-2' : ''}
              >
                <legend className="mb-2 font-medium text-gray-700 dark:text-gray-100">
                  {title}
                </legend>
                <div
                  className={index === 1 ? 'grid gap-x-4 sm:grid-cols-2' : ''}
                >
                  {types.map(([value, label]) => (
                    <Checkbox
                      key={value}
                      id={`activity-type-${value}`}
                      className="flex items-center"
                      label={label}
                      checked={filters.types.includes(value)}
                      onChange={(event) =>
                        onChange({
                          ...filters,
                          types: event.target.checked
                            ? [...filters.types, value]
                            : filters.types.filter((type) => type !== value),
                        })
                      }
                    />
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

function ModeratorActivityHistory({
  filters,
  window,
  liveRefresh,
  onCurrentPeriod,
}: {
  filters: ModeratorFilters
  window: StatsWindow
  liveRefresh: boolean
  onCurrentPeriod: () => void
}) {
  const container = useRef<HTMLDivElement>(null)
  const query = useModeratorActivity(filters, window, container, liveRefresh)
  if (activityAccessDenied(query.error))
    return (
      <p role="alert">
        You do not have access to this moderator activity. Contact an admin if
        you need access.
      </p>
    )
  const busy = query.loading || query.loadingOlder || query.refreshing
  return (
    <div ref={container} className="space-y-3">
      {query.rolledOver && (
        <p role="status">
          A new UTC day has started. Your current review is preserved.{' '}
          <button type="button" className={linkClass} onClick={onCurrentPeriod}>
            Show current period
          </button>
        </p>
      )}
      {query.loading && <p role="status">Loading activity…</p>}
      {!!query.error && (
        <p role="alert">
          Activity may be out of date. Could not load activity.{' '}
          <button
            type="button"
            disabled={busy}
            className={linkClass}
            onClick={() => query.refresh()}
          >
            Retry
          </button>
        </p>
      )}
      {!query.loading && !query.error && !query.rows.length && (
        <p>No activity matches these filters.</p>
      )}
      <ActivityStream rows={query.rows} />
      {query.cursor && (
        <LoadMoreButton disabled={busy} onClick={() => query.loadOlder()}>
          {query.loadingOlder ? 'Loading…' : 'Load older activity'}
        </LoadMoreButton>
      )}
    </div>
  )
}

const activityDateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'medium',
  timeZone: 'UTC',
})

export function ActivityStream({ rows }: { rows: ActivityRow[] }) {
  if (!rows.length) return null
  return (
    <ModToolProvider>
      <div aria-label="Moderator activity" className="space-y-5">
        {rows.map((row) => (
          <article
            key={activityIdentity(row)}
            data-activity-id={activityIdentity(row)}
          >
            {row.event ? (
              <ModEventItem
                modEvent={row.event}
                showContentDetails={false}
                showContentAuthor={false}
                showContentPreview={false}
                useUtc
                context={<ActivityContext row={row} />}
              />
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-gray-500 dark:text-gray-50">
                  <p>
                    <span className="text-blue-400">
                      {ACTIVITY_TITLES[row.type] ??
                        EVENT_TITLES[row.type] ??
                        row.type.split('#').at(-1)}
                    </span>
                    <i>
                      {' '}
                      at{' '}
                      <time dateTime={row.createdAt}>
                        {activityDateFormatter.format(new Date(row.createdAt))}{' '}
                        UTC
                      </time>
                    </i>
                  </p>
                  <ActivityContext row={row} />
                </div>
                <Card className="space-y-2">
                  {row.activity ? (
                    <ActivityItem activity={row.activity} />
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      By {row.createdBy}. Activity details are unavailable.
                    </p>
                  )}
                  {row.activity?.publicNote && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Public note
                      </p>
                      <TextWithLinks text={row.activity.publicNote} />
                    </div>
                  )}
                  {row.type === 'closeActivity' && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {row.actionEventId
                        ? 'Linked to action'
                        : row.activity?.meta?.resolution === 'noAction'
                          ? 'No action'
                          : 'Outcome unknown'}
                    </p>
                  )}
                  {row.actionEventId && (
                    <Link
                      target="_blank"
                      rel="noopener noreferrer"
                      prefetch={false}
                      className={`inline-block text-sm ${linkClass}`}
                      href={`/events/${row.actionEventId}`}
                    >
                      Linked action #{row.actionEventId}
                    </Link>
                  )}
                </Card>
              </>
            )}
          </article>
        ))}
      </div>
    </ModToolProvider>
  )
}

function ActivityContext({ row }: { row: ActivityRow }) {
  const subjectHref = row.subject?.startsWith('did:')
    ? `/repositories/${row.subject}`
    : row.subject?.startsWith('at://')
      ? `/repositories/${row.subject.slice(5)}`
      : undefined
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
      <span className="text-gray-500 dark:text-gray-400">
        {row.source === 'event' ? 'Moderation event' : 'Report activity'}
      </span>
      {row.reportId ? (
        <Link
          target="_blank"
          rel="noopener noreferrer"
          prefetch={false}
          href={reportReviewHref(row.reportId)}
          className={linkClass}
        >
          Report #{row.reportId}
        </Link>
      ) : subjectHref ? (
        <Link
          target="_blank"
          rel="noopener noreferrer"
          prefetch={false}
          href={subjectHref}
          className={`max-w-64 truncate ${linkClass}`}
          title={row.subject}
        >
          {row.event?.subjectHandle
            ? `@${row.event.subjectHandle}`
            : row.subject}
        </Link>
      ) : (
        <span className="max-w-64 truncate" title={row.subject}>
          {row.subject ?? 'Subject unavailable'}
        </span>
      )}
      {row.source === 'event' && !row.event && (
        <Link
          target="_blank"
          rel="noopener noreferrer"
          prefetch={false}
          href={`/events/${row.id}`}
          className={linkClass}
        >
          Event #{row.id}
        </Link>
      )}
    </div>
  )
}
