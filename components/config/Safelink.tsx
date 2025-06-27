'use client'
import { ToolsOzoneSafelinkDefs } from '@atproto/api'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDebounce } from 'react-use'
import { SafelinkRuleList } from '@/safelink/RuleList'
import { SafelinkEditor } from '@/safelink/Editor'
import { SafelinkEventList } from '@/safelink/EventList'
import { ActionButton, ButtonGroup, LinkButton } from '@/common/buttons'
import { Input } from '@/common/forms'
import { useSyncedState } from '@/lib/useSyncedState'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline'
import { createSafelinkPageLink } from '@/safelink/helpers'

export enum SafelinkView {
  List = 'safelink-list',
  Events = 'safelink-events',
}

const SafelinkSearchInput = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchQuery = searchParams.get('search') || ''
  const view = searchParams.get('view') || SafelinkView.List
  const [inputValue, setInputValue] = useSyncedState(searchQuery)

  useDebounce(
    () => {
      if (inputValue !== searchQuery) {
        const url = createSafelinkPageLink({ search: inputValue })
        router.push(url, { scroll: false })
      }
    },
    300,
    [inputValue],
  )

  const handleCancel = () => {
    const url = createSafelinkPageLink({ view })
    router.push(url, { scroll: false })
  }

  return (
    <div className="flex items-center gap-4 mb-4">
      <div className="flex-1">
        <Input
          type="text"
          placeholder="Search rules by URL or domain..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          autoFocus
        />
      </div>
      <ActionButton size="sm" appearance="outlined" onClick={handleCancel}>
        Cancel
      </ActionButton>
    </div>
  )
}

export function SafelinkConfig({
  searchQuery,
  view,
  onViewChange,
  editingRule,
  onEditRule,
  creatingRule,
  onCreateRule,
  viewingEvents,
  onViewEvents,
}: {
  searchQuery: string
  view: SafelinkView
  onViewChange: (view: SafelinkView) => void
  editingRule?: ToolsOzoneSafelinkDefs.UrlRule | null
  onEditRule: (rule: ToolsOzoneSafelinkDefs.UrlRule | null) => void
  creatingRule: boolean
  onCreateRule: (creating: boolean) => void
  viewingEvents?: {
    url: string
    pattern: ToolsOzoneSafelinkDefs.PatternType
  } | null
  onViewEvents: (
    params: { url: string; pattern: ToolsOzoneSafelinkDefs.PatternType } | null,
  ) => void
}) {
  const searchParams = useSearchParams()
  const searchFromUrl = searchParams.get('search')
  const showSearch = typeof searchFromUrl === 'string'

  const showEditor = creatingRule || editingRule
  const showEventDetails = viewingEvents

  const handleEditSuccess = () => {
    onEditRule(null)
    onCreateRule(false)
  }

  const handleEditCancel = () => {
    onEditRule(null)
    onCreateRule(false)
  }

  const handleViewEvents = (
    url: string,
    pattern: ToolsOzoneSafelinkDefs.PatternType,
  ) => {
    onViewEvents({ url, pattern })
    onViewChange(SafelinkView.Events)
  }

  const handleBackToList = () => {
    onViewEvents(null)
    onViewChange(SafelinkView.List)
  }

  if (showEditor) {
    return (
      <SafelinkEditor
        rule={editingRule}
        onSuccess={handleEditSuccess}
        onCancel={handleEditCancel}
      />
    )
  }

  return (
    <div className="pt-4">
      {showSearch ? (
        <SafelinkSearchInput />
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {showEventDetails && (
                <ActionButton
                  size="sm"
                  appearance="primary"
                  onClick={handleBackToList}
                >
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Back to Rules
                </ActionButton>
              )}

              <h4 className="font-medium text-gray-700 dark:text-gray-100">
                {showEventDetails ? 'Safelink Events' : 'Safelink Rules'}
              </h4>
            </div>

            {!showEventDetails && (
              <div className="flex flex-row justify-end">
                <ActionButton
                  appearance="primary"
                  size="sm"
                  onClick={() => onCreateRule(true)}
                >
                  <PlusIcon className="h-3 w-3 mr-1" />
                  <span className="text-xs">Add Rule</span>
                </ActionButton>

                <LinkButton
                  size="sm"
                  className="ml-1"
                  appearance="outlined"
                  href={createSafelinkPageLink({ search: '' })}
                >
                  <MagnifyingGlassIcon className="h-4 w-4" />
                </LinkButton>
                <ButtonGroup
                  size="xs"
                  appearance="primary"
                  items={[
                    {
                      id: 'rules',
                      text: 'Rules',
                      onClick: () => onViewChange(SafelinkView.List),
                      isActive: view === SafelinkView.List,
                    },
                    {
                      id: 'events',
                      text: 'Events',
                      onClick: () => onViewChange(SafelinkView.Events),
                      isActive: view === SafelinkView.Events,
                    },
                  ]}
                />
              </div>
            )}
          </div>
        </>
      )}

      {showEventDetails ? (
        <SafelinkEventList
          searchQuery={searchQuery}
          url={viewingEvents.url}
          pattern={viewingEvents.pattern}
        />
      ) : view === SafelinkView.List ? (
        <SafelinkRuleList
          searchQuery={searchQuery}
          onEdit={onEditRule}
          onViewEvents={handleViewEvents}
        />
      ) : (
        <SafelinkEventList searchQuery={searchQuery} />
      )}
    </div>
  )
}
