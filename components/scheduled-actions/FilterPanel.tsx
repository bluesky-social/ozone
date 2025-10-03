'use client'
import { useState } from 'react'
import { ActionButton } from '@/common/buttons'
import { FormLabel, Input, Textarea } from '@/common/forms'
import { StatusSelector } from './StatusSelector'

interface FilterPanelProps {
  isOpen: boolean
  onClose: () => void
  currentFilters: {
    startsAfter?: string
    endsBefore?: string
    subjects?: string[]
    statuses?: string[]
  }
  onApplyFilters: (filters: {
    startsAfter?: string
    endsBefore?: string
    subjects?: string[]
    statuses?: string[]
  }) => void
}

const DEFAULT_STATUSES = ['pending', 'executed', 'cancelled', 'failed']

export function ScheduledActionsFilterPanel({
  isOpen,
  currentFilters,
  onApplyFilters,
}: FilterPanelProps) {
  const [startsAfter, setStartTime] = useState<string>(
    currentFilters.startsAfter || '',
  )
  const [endsBefore, setEndTime] = useState<string>(currentFilters.endsBefore || '')
  const [subjects, setSubjects] = useState<string>(
    currentFilters.subjects ? currentFilters.subjects.join(', ') : '',
  )
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    currentFilters.statuses && currentFilters.statuses.length > 0
      ? currentFilters.statuses
      : DEFAULT_STATUSES,
  )

  const handleApplyFilters = () => {
    const filters: any = {}

    if (startsAfter.trim()) filters.startsAfter = startsAfter.trim()
    if (endsBefore.trim()) filters.endsBefore = endsBefore.trim()
    if (subjects.trim()) {
      filters.subjects = subjects
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    }
    if (selectedStatuses.length > 0) filters.statuses = selectedStatuses

    onApplyFilters(filters)
  }

  const handleClearFilters = () => {
    setStartTime('')
    setEndTime('')
    setSubjects('')
    setSelectedStatuses(DEFAULT_STATUSES)
    onApplyFilters({})
  }

  const hasActiveFilters =
    currentFilters.startsAfter ||
    currentFilters.endsBefore ||
    (currentFilters.subjects && currentFilters.subjects.length > 0) ||
    (currentFilters.statuses && currentFilters.statuses.length > 0)

  if (!isOpen) return null

  return (
    <div className="mb-4 border-b border-t py-2 border-gray-200 dark:border-gray-700">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <FormLabel label="Start Time" htmlFor="start-time-filter" />
          <Input
            id="start-time-filter"
            type="datetime-local"
            value={startsAfter}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <FormLabel label="End Time" htmlFor="end-time-filter" />
          <Input
            id="end-time-filter"
            type="datetime-local"
            value={endsBefore}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <FormLabel label="Status" />
          <StatusSelector
            selectedStatuses={selectedStatuses}
            onStatusChange={setSelectedStatuses}
          />
        </div>
      </div>

      <div className="mt-4">
        <FormLabel label="Subject DIDs" htmlFor="subjects-filter" />
        <Textarea
          id="subjects-filter"
          value={subjects}
          onChange={(e) => setSubjects(e.target.value)}
          placeholder="did:plc:example1, did:plc:example2"
          rows={2}
          className="w-full text-sm"
        />
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Enter comma-separated DID subjects
        </div>
      </div>

      <div className="flex items-end gap-2 mt-2">
        <ActionButton
          size="sm"
          appearance="primary"
          onClick={handleApplyFilters}
        >
          Apply Filters
        </ActionButton>
        <ActionButton
          size="sm"
          appearance="outlined"
          onClick={handleClearFilters}
          disabled={!hasActiveFilters}
        >
          Reset Filters
        </ActionButton>
      </div>
    </div>
  )
}
