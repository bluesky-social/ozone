import { ActionButton } from '@/common/buttons'
import { DateRangeValue } from '@/common/DateRangeFilter'
import { ConfirmationModal } from '@/common/modals/confirmation'
import { usePermission } from '@/shell/ConfigurationContext'
import { useState } from 'react'
import {
  getStatsRefreshDates,
  MAX_STATS_REFRESH_DAYS,
  useRefreshStats,
} from './useReportStats'

export function RefreshStats({ dateRange }: { dateRange: DateRangeValue }) {
  const canRefreshStats = usePermission('canRefreshStats')
  const refresh = useRefreshStats()
  const [selectedDates, setSelectedDates] = useState<string[] | null>(null)
  const dates = getStatsRefreshDates(dateRange.startDate, dateRange.endDate)

  if (!canRefreshStats) return null

  return (
    <div className="max-w-sm space-y-2 text-sm">
      <ActionButton
        appearance="outlined"
        size="sm"
        className="min-h-[38px]"
        disabled={refresh.isLoading || !dates.length}
        onClick={() => setSelectedDates(dates)}
      >
        Recompute stats
      </ActionButton>
      {!dates.length && (
        <p className="text-gray-500 dark:text-gray-400">
          Select a valid start and end date to recompute.
        </p>
      )}
      <p role="status" className="text-gray-600 dark:text-gray-300">
        {refresh.isLoading
          ? `Recomputing stats: ${refresh.progress.completed} of ${refresh.progress.total} days completed. Keep this page open.`
          : refresh.isSuccess
            ? `Recomputed stats for ${refresh.progress.completed} days.`
            : null}
      </p>
      {refresh.isError && (
        <p role="alert" className="text-red-600 dark:text-red-400">
          {refresh.error instanceof Error
            ? refresh.error.message
            : 'Failed to recompute stats.'}
        </p>
      )}
      <ConfirmationModal
        isOpen={selectedDates !== null}
        setIsOpen={(open) => {
          if (!open) setSelectedDates(null)
        }}
        title="Recompute report statistics?"
        description={
          <>
            <span
              role="alert"
              className="mb-3 block text-amber-700 dark:text-amber-300"
            >
              Only the most recent {MAX_STATS_REFRESH_DAYS} days of your
              selected range will be recomputed. Shorter ranges will be
              recomputed in full. Your date selection will stay the same. This
              can take several minutes; keep this page open until it finishes.
            </span>
            Recompute {selectedDates?.[0]} through {selectedDates?.at(-1)} (UTC)
            for aggregate totals, categories, and active queues and moderators,
            regardless of the current grouping filter.
          </>
        }
        confirmButtonText="Recompute"
        confirmButtonDisabled={refresh.isLoading}
        onConfirm={() => {
          if (!selectedDates?.length || refresh.isLoading) return
          refresh.mutate({
            startDate: selectedDates[0],
            endDate: selectedDates[selectedDates.length - 1],
          })
          setSelectedDates(null)
        }}
      />
    </div>
  )
}
