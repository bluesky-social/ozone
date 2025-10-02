'use client'
import { useState } from 'react'
import { ActionButton } from '@/common/buttons'
import { FormLabel, Input, Textarea, Select } from '@/common/forms'

interface FilterPanelProps {
  isOpen: boolean
  onClose: () => void
  currentFilters: {
    startTime?: string
    endTime?: string
    subjects?: string[]
    statuses?: string[]
  }
  onApplyFilters: (filters: {
    startTime?: string
    endTime?: string
    subjects?: string[]
    statuses?: string[]
  }) => void
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'executed', label: 'Executed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'failed', label: 'Failed' },
]

export function ScheduledActionsFilterPanel({
  isOpen,
  currentFilters,
  onApplyFilters,
}: FilterPanelProps) {
  const [startTime, setStartTime] = useState<string>(
    currentFilters.startTime || '',
  )
  const [endTime, setEndTime] = useState<string>(currentFilters.endTime || '')
  const [subjects, setSubjects] = useState<string>(
    currentFilters.subjects ? currentFilters.subjects.join(', ') : '',
  )
  const [status, setStatus] = useState<string>(
    currentFilters.statuses && currentFilters.statuses.length > 0
      ? currentFilters.statuses[0]
      : '',
  )

  const handleApplyFilters = () => {
    const filters: any = {}

    if (startTime.trim()) filters.startTime = startTime.trim()
    if (endTime.trim()) filters.endTime = endTime.trim()
    if (subjects.trim()) {
      filters.subjects = subjects
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    }
    if (status) filters.statuses = [status]

    onApplyFilters(filters)
  }

  const handleClearFilters = () => {
    setStartTime('')
    setEndTime('')
    setSubjects('')
    setStatus('')
    onApplyFilters({})
  }

  const hasActiveFilters =
    currentFilters.startTime ||
    currentFilters.endTime ||
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
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <FormLabel label="End Time" htmlFor="end-time-filter" />
          <Input
            id="end-time-filter"
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <FormLabel label="Status" htmlFor="status-filter" />
          <Select
            id="status-filter"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
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
