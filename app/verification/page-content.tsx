import { Dropdown } from '@/common/Dropdown'
import { EmptyDataset } from '@/common/feeds/EmptyFeed'
import { Loading } from '@/common/Loader'
import { LoadMoreButton } from '@/common/LoadMoreButton'
import { useWorkspaceOpener } from '@/common/useWorkspaceOpener'
import { useEmitEvent } from '@/mod-event/helpers/emitEvent'
import { useWorkspaceAddItemsMutation } from '@/workspace/hooks'
import { WorkspacePanel } from '@/workspace/Panel'
import { ToolsOzoneModerationEmitEvent } from '@atproto/api'
import { CheckCircleIcon, Cog8ToothIcon } from '@heroicons/react/24/solid'
import { ModActionPanelQuick } from 'app/actions/ModActionPanel/QuickAction'
import { VerificationFilterPanel } from 'components/verification/FilterPanel'
import { VerificationList } from 'components/verification/List'
import {
  useVerificationFilter,
  useVerificationList,
} from 'components/verification/useVerificationList'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useTitle } from 'react-use'

export const VerificationPageContent = () => {
  const [isFiltersShown, setIsFiltersShown] = useState(false)
  const emitEvent = useEmitEvent()
  const searchParams = useSearchParams()
  const isRevoked = searchParams.get('isRevoked') || undefined
  const issuers = searchParams.get('issuers') ?? ''
  const createdAfter = searchParams.get('createdAfter') ?? undefined
  const createdBefore = searchParams.get('createdBefore') ?? undefined

  const router = useRouter()
  const pathname = usePathname()
  const quickOpenParam = searchParams.get('quickOpen') ?? ''

  const setQuickActionPanelSubject = (subject?: string) => {
    // This route should not have any search params but in case it does, let's make sure original params are maintained
    const newParams = new URLSearchParams(searchParams)
    if (!subject) {
      newParams.delete('quickOpen')
    } else {
      newParams.set('quickOpen', subject)
    }
    router.push((pathname ?? '') + '?' + newParams.toString())
  }

  let pageTitle = `Verifications`

  useTitle(pageTitle)

  const { filters, applyFilters, resetFilters } = useVerificationFilter()
  const { data, isLoading, fetchNextPage, hasNextPage, isInitialLoading } =
    useVerificationList(filters)
  const verifications = data?.pages?.flatMap((page) => page.verifications) ?? []

  const { mutate: addToWorkspace } = useWorkspaceAddItemsMutation()
  const { toggleWorkspacePanel, isWorkspaceOpen } = useWorkspaceOpener()
  const configOptions = [
    {
      id: 'filters',
      text: isFiltersShown ? 'Hide filters' : 'Show filters',
      onClick: () => {
        setIsFiltersShown((show) => !show)
      },
    },
    {
      id: 'add_users_to_workspace',
      text: 'Add verified users to workspace',
      onClick: () => {
        addToWorkspace(verifications.map((item) => item.subject))
      },
    },
    {
      id: 'add_issuers_to_workspace',
      text: 'Add verifiers to workspace',
      onClick: () => {
        addToWorkspace(verifications.map((item) => item.issuer))
      },
    },
  ]

  return (
    <div className="w-5/6 sm:w-3/4 md:w-2/3 lg:w-1/2 mx-auto my-4 dark:text-gray-100">
      <div className="flex flex-row justify-between items-center">
        <h4 className="font-medium text-gray-700 dark:text-gray-100">
          Verifications
        </h4>
        <div className="flex-1 lg:text-right pl-1 lg:pt-0">
          <Dropdown
            containerClassName="inline-block"
            rightAligned
            className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-400 bg-white dark:bg-slate-800 dark:text-gray-100 dark px-3 py-1 text-sm text-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700"
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
        <VerificationFilterPanel
          filters={filters}
          onApplyFilters={applyFilters}
          onResetFilters={resetFilters}
        />
      )}

      {!isLoading && !verifications.length && (
        <EmptyDataset message="No verifications indexed">
          <CheckCircleIcon className="h-8 w-8" />
        </EmptyDataset>
      )}

      {isLoading && <Loading message="Loading verifications..." />}

      <VerificationList verifications={verifications} />

      {hasNextPage && (
        <div className="flex justify-center">
          <LoadMoreButton onClick={() => fetchNextPage()} />
        </div>
      )}

      <ModActionPanelQuick
        open={!!quickOpenParam}
        onClose={() => setQuickActionPanelSubject()}
        setSubject={setQuickActionPanelSubject}
        subject={quickOpenParam} // select first subject if there are multiple
        subjectOptions={[quickOpenParam]}
        isInitialLoading={isInitialLoading}
        onSubmit={async (vals: ToolsOzoneModerationEmitEvent.InputSchema) => {
          await emitEvent(vals)
        }}
      />
      <WorkspacePanel
        open={isWorkspaceOpen}
        onClose={() => toggleWorkspacePanel()}
      />
    </div>
  )
}
