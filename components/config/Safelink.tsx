'use client'
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
import Link from 'next/link'
import { ToolsOzoneSafelinkDefs } from '@atproto/api'

export enum SafelinkView {
  List = 'list',
  Events = 'events',
  Create = 'create',
  Edit = 'edit',
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

export function SafelinkConfig() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchFromUrl = searchParams.get('search')
  const showSearch = typeof searchFromUrl === 'string'
  const view = searchParams.get('view') || SafelinkView.List
  const isEditingRule = view === SafelinkView.Edit
  const showEditor = view === SafelinkView.Create || isEditingRule
  const isEventsView = view === SafelinkView.Events

  if (showEditor) {
    return <SafelinkEditor />
  }

  return (
    <div className="pt-4">
      {showSearch ? (
        <SafelinkSearchInput />
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {isEditingRule && (
                <Link href="/configure?tab=safelink&view=list">
                  <ArrowLeftIcon className="h-4 w-4" />
                </Link>
              )}

              <h4 className="font-medium text-gray-700 dark:text-gray-100">
                {isEventsView ? 'Safelink Events' : 'Safelink Rules'}
              </h4>
            </div>

            {!showEditor && (
              <div className="flex flex-row justify-end">
                <LinkButton
                  appearance="primary"
                  size="sm"
                  href={createSafelinkPageLink({
                    view: SafelinkView.Create,
                  })}
                >
                  <PlusIcon className="h-3 w-3 mr-1" />
                  <span className="text-xs">Add Rule</span>
                </LinkButton>

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
                      onClick: () =>
                        router.push(
                          createSafelinkPageLink({ view: SafelinkView.List }),
                        ),
                      isActive: view === SafelinkView.List,
                    },
                    {
                      id: 'events',
                      text: 'Events',
                      onClick: () =>
                        router.push(
                          createSafelinkPageLink({ view: SafelinkView.Events }),
                        ),
                      isActive: view === SafelinkView.Events,
                    },
                  ]}
                />
              </div>
            )}
          </div>
        </>
      )}

      {isEventsView ? (
        <SafelinkEventList
          urls={searchParams.get('urls')?.split(',') || []}
          pattern={
            searchParams.get('pattern')
              ? (searchParams.get(
                  'pattern',
                ) as ToolsOzoneSafelinkDefs.PatternType)
              : undefined
          }
        />
      ) : (
        <SafelinkRuleList />
      )}
    </div>
  )
}
