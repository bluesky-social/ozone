'use client'
import { ToolsOzoneSafelinkDefs } from '@atproto/api'
import { useState } from 'react'
import { SafelinkList } from '../safelink/SafelinkList'
import { SafelinkEditor } from '../safelink/SafelinkEditor'
import { SafelinkEventsView } from '../safelink/SafelinkEventsView'
import { createSafelinkPageLink } from '../safelink/helpers'
import { ActionButton } from '@/common/buttons'
import { Input } from '@/common/forms'
import { Card } from '@/common/Card'
import { PlusIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'

export enum SafelinkView {
  List = 'safelink-list',
  Events = 'safelink-events',
}

interface SafelinkConfigProps {
  searchQuery: string
  onSearchChange: (search: string) => void
  view: SafelinkView
  onViewChange: (view: SafelinkView) => void
  editingRule?: ToolsOzoneSafelinkDefs.UrlRule | null
  onEditRule: (rule: ToolsOzoneSafelinkDefs.UrlRule | null) => void
  creatingRule: boolean
  onCreateRule: (creating: boolean) => void
  viewingEvents?: { url: string; pattern: ToolsOzoneSafelinkDefs.PatternType } | null
  onViewEvents: (params: { url: string; pattern: ToolsOzoneSafelinkDefs.PatternType } | null) => void
}

export function SafelinkConfig({
  searchQuery,
  onSearchChange,
  view,
  onViewChange,
  editingRule,
  onEditRule,
  creatingRule,
  onCreateRule,
  viewingEvents,
  onViewEvents,
}: SafelinkConfigProps) {
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

  const handleViewEvents = (url: string, pattern: ToolsOzoneSafelinkDefs.PatternType) => {
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
    <div className="space-y-4">
      {/* Header and controls */}
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {showEventDetails && (
                <ActionButton
                  size="sm"
                  variant="outline"
                  onClick={handleBackToList}
                >
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Back to Rules
                </ActionButton>
              )}
              
              <h2 className="text-lg font-semibold">
                {showEventDetails ? 'Safelink Events' : 'Safelink Rules'}
              </h2>
            </div>

            {!showEventDetails && (
              <ActionButton onClick={() => onCreateRule(true)}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Rule
              </ActionButton>
            )}
          </div>

          {/* Search and view toggle */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder={showEventDetails ? "Search events by URL or domain..." : "Search rules by URL or domain..."}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>

            {!showEventDetails && (
              <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg">
                <button
                  className={`px-3 py-2 text-sm font-medium rounded-l-lg ${
                    view === SafelinkView.List
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => onViewChange(SafelinkView.List)}
                >
                  Rules
                </button>
                <button
                  className={`px-3 py-2 text-sm font-medium rounded-r-lg border-l border-gray-300 dark:border-gray-600 ${
                    view === SafelinkView.Events
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => onViewChange(SafelinkView.Events)}
                >
                  Events
                </button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Content */}
      {showEventDetails ? (
        <SafelinkEventsView
          searchQuery={searchQuery}
          url={viewingEvents.url}
          pattern={viewingEvents.pattern}
        />
      ) : view === SafelinkView.List ? (
        <SafelinkList
          searchQuery={searchQuery}
          onEdit={onEditRule}
          onViewEvents={handleViewEvents}
        />
      ) : (
        <SafelinkEventsView searchQuery={searchQuery} />
      )}
    </div>
  )
}