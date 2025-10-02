'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTitle } from 'react-use'
import { useState } from 'react'
import { Cog8ToothIcon } from '@heroicons/react/24/solid'
import { ClockIcon } from '@heroicons/react/24/outline'
import { Dropdown } from '@/common/Dropdown'
import { Loading } from '@/common/Loader'
import { EmptyDataset } from '@/common/feeds/EmptyFeed'
import { ScheduledActionsTable } from '@/scheduled-actions/ScheduledActionsTable'
import { ScheduledActionsFilterPanel } from '@/scheduled-actions/FilterPanel'
import {
  useScheduledActionsList,
  useScheduledActionsListFilter,
} from '@/scheduled-actions/useScheduledActionsList'
import { WorkspacePanel } from '@/workspace/Panel'
import { useWorkspaceOpener } from '@/common/useWorkspaceOpener'
import { ModActionPanelQuick } from 'app/actions/ModActionPanel/QuickAction'
import {
  ToolsOzoneModerationDefs,
  ToolsOzoneModerationEmitEvent,
} from '@atproto/api'
import {
  ActionPanelNames,
  hydrateModToolInfo,
  useEmitEvent,
} from '@/mod-event/helpers/emitEvent'
import { ActionButton } from '@/common/buttons'
import { ConfirmationModal } from '@/common/modals/confirmation'
import { chunkArray } from '@/lib/util'
import { useCancelScheduledAction } from '@/scheduled-actions/useScheduledActionsList'

export function ScheduledActionsPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [selectedDids, setSelectedDids] = useState<string[]>([])
  const [isFiltersShown, setIsFiltersShown] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const emitEvent = useEmitEvent()
  const { toggleWorkspacePanel, isWorkspaceOpen } = useWorkspaceOpener()
  const cancelMutation = useCancelScheduledAction()

  const quickOpenParam = searchParams.get('quickOpen') ?? ''
  const setQuickActionPanelSubject = (subject: string) => {
    const newParams = new URLSearchParams(document.location.search)
    if (!subject) {
      newParams.delete('quickOpen')
    } else {
      newParams.set('quickOpen', subject)
    }
    router.push((pathname ?? '') + '?' + newParams.toString())
  }

  const { filters, updateFilters, hasActiveFilters } =
    useScheduledActionsListFilter(searchParams, router, pathname)
  const { actions, repos, fetchNextPage, hasNextPage, isLoading, refetch } =
    useScheduledActionsList(filters)

  useTitle('Scheduled Actions')

  const handleSelect = (
    action: ToolsOzoneModerationDefs.ScheduledActionView,
    selected: boolean,
  ) => {
    if (selected) {
      setSelectedDids((prev) => [...prev, action.did])
    } else {
      setSelectedDids((prev) => prev.filter((did) => did !== action.did))
    }
  }

  const handleCancelConfirm = async () => {
    await cancelMutation.mutateAsync({ subjects: selectedDids })

    setSelectedDids([])
    setShowCancelModal(false)
    refetch()
  }

  const configOptions = [
    {
      id: 'filters',
      text: isFiltersShown ? 'Hide filters' : 'Show filters',
      onClick: () => setIsFiltersShown((show) => !show),
    },
    {
      id: 'clear_filters',
      text: 'Clear all filters',
      onClick: () => updateFilters({}),
      disabled: !hasActiveFilters,
    },
  ]

  return (
    <div className="w-5/6 sm:w-3/4 md:w-2/3 lg:w-1/2 mx-auto my-4 dark:text-gray-100">
      <div className="flex flex-row justify-between items-center mb-3">
        <h4 className="font-medium text-gray-700 dark:text-gray-100">
          Scheduled Actions
        </h4>
        <div className="flex flex-row items-center gap-2">
          {selectedDids.length > 0 && (
            <ActionButton
              size="xs"
              appearance="negative"
              onClick={() => setShowCancelModal(true)}
            >
              Cancel
            </ActionButton>
          )}
          <Dropdown
            containerClassName="inline-block"
            rightAligned
            className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-400 bg-white dark:bg-slate-800 dark:text-gray-100 px-3 py-1 text-sm text-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700"
            items={configOptions}
          >
            <Cog8ToothIcon
              className="-ml-1 mr-2 h-4 w-4 text-gray-400"
              aria-hidden="true"
            />
            <span className="text-xs">Options</span>
          </Dropdown>
        </div>
      </div>

      {isFiltersShown && (
        <ScheduledActionsFilterPanel
          isOpen={isFiltersShown}
          onClose={() => setIsFiltersShown(false)}
          currentFilters={filters}
          onApplyFilters={(newFilters) => {
            updateFilters(newFilters)
          }}
        />
      )}

      {!isLoading && !actions.length && (
        <EmptyDataset message="No scheduled actions found">
          <ClockIcon className="h-8 w-8" />
        </EmptyDataset>
      )}

      {isLoading ? (
        <Loading message="Loading scheduled actions..." />
      ) : (
        <ScheduledActionsTable
          actions={actions}
          repos={repos}
          onLoadMore={fetchNextPage}
          showLoadMore={!!hasNextPage}
          onSelect={handleSelect}
        />
      )}
      <WorkspacePanel
        open={isWorkspaceOpen}
        onClose={() => toggleWorkspacePanel()}
      />
      <ModActionPanelQuick
        open={!!quickOpenParam}
        onClose={() => setQuickActionPanelSubject('')}
        setSubject={setQuickActionPanelSubject}
        subject={quickOpenParam} // select first subject if there are multiple
        subjectOptions={
          Object.keys(repos).length > 0 ? Object.keys(repos) : [quickOpenParam]
        }
        isInitialLoading={isLoading}
        onSubmit={async (vals: ToolsOzoneModerationEmitEvent.InputSchema) => {
          await emitEvent(
            hydrateModToolInfo(vals, ActionPanelNames.QuickAction),
          )
          refetch()
        }}
      />
      <ConfirmationModal
        isOpen={showCancelModal}
        setIsOpen={setShowCancelModal}
        onConfirm={handleCancelConfirm}
        title="Cancel Scheduled Actions"
        confirmButtonText={
          cancelMutation.isLoading ? 'Cancelling...' : 'Cancel Actions'
        }
        confirmButtonDisabled={cancelMutation.isLoading}
        description={
          <>
            Are you sure you want to cancel scheduled actions for{' '}
            {selectedDids.length} selected items?
          </>
        }
      />
    </div>
  )
}
