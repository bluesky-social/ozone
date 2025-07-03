'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SafelinkRuleList } from '@/safelink/RuleList'
import { SafelinkEditor } from '@/safelink/Editor'
import { SafelinkEventList } from '@/safelink/EventList'
import { SafelinkFilterPanel } from '@/safelink/FilterPanel'
import { ActionButton, ButtonGroup, LinkButton } from '@/common/buttons'
import {
  PlusIcon,
  FunnelIcon,
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

export function SafelinkConfig() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const view = searchParams.get('view') || SafelinkView.List
  const isEditingRule = view === SafelinkView.Edit
  const showEditor = view === SafelinkView.Create || isEditingRule
  const isEventsView = view === SafelinkView.Events

  const hasActiveFilters = !!(
    searchParams.get('pattern') ||
    searchParams.get('urls') ||
    searchParams.get('actions')
  )

  if (showEditor) {
    return <SafelinkEditor />
  }

  return (
    <div className="pt-4">
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
          <div className="flex flex-row justify-end items-center gap-2">
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

            <ActionButton
              size="sm"
              data-cy="safelink-filter-button"
              appearance={hasActiveFilters ? 'primary' : 'outlined'}
              onClick={() => setIsFilterOpen(true)}
              title={`Filter ${isEventsView ? 'Events' : 'Rules'}`}
            >
              <FunnelIcon className="h-4 w-4" />
            </ActionButton>

            <ButtonGroup
              size="xs"
              appearance="primary"
              className="safelink-view-toggle"
              items={[
                {
                  id: 'safelink_rules',
                  text: 'Rules',
                  onClick: () =>
                    router.push(
                      createSafelinkPageLink({ view: SafelinkView.List }),
                    ),
                  isActive: view === SafelinkView.List,
                },
                {
                  id: 'safelink_events',
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

      <SafelinkFilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        view={view}
      />

      {isEventsView ? <SafelinkEventList /> : <SafelinkRuleList />}
    </div>
  )
}
