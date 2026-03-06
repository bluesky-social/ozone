import { ActionButton } from '@/common/buttons'
import { CollectionAutocomplete } from '@/common/CollectionAutocomplete'
import { Select } from '@/common/forms'
import { ReportTypeMultiselect } from '@/reports/ReportTypeMultiselect'
import { useState } from 'react'
import { useDebounce } from 'react-use'
import { QueueListFilters } from './useQueues'

export function QueueFilters({
  filters,
  onChange,
  children,
}: {
  filters: QueueListFilters
  onChange: (filters: QueueListFilters) => void
  children?: React.ReactNode
}) {
  const updateFilter = <K extends keyof QueueListFilters>(
    key: K,
    value: QueueListFilters[K],
  ) => onChange({ ...filters, [key]: value })

  // debounced collection field
  const [collectionInput, setCollectionInput] = useState<string | undefined>(
    filters.collection,
  )
  useDebounce(
    () => updateFilter('collection', collectionInput || undefined),
    300,
    [collectionInput],
  )

  const resetFilters = () => {
    onChange({})
    setCollectionInput(undefined)
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Select
          className="h-fit text-xs"
          value={
            filters.enabled === undefined
              ? 'all'
              : filters.enabled
                ? 'enabled'
                : 'disabled'
          }
          onChange={(e) => {
            const val = e.target.value
            updateFilter(
              'enabled',
              val === 'all' ? undefined : val === 'enabled',
            )
          }}
        >
          <option value="all">All</option>
          <option value="enabled">Enabled</option>
          <option value="disabled">Disabled</option>
        </Select>
        <Select
          className="h-fit text-xs"
          value={filters.subjectType ?? 'all'}
          onChange={(e) => {
            const val = e.target.value
            updateFilter('subjectType', val === 'all' ? undefined : val)
          }}
        >
          <option value="all">All subjects</option>
          <option value="account">account</option>
          <option value="record">record</option>
          <option value="message">message</option>
        </Select>
        <CollectionAutocomplete
          className="min-w-[10rem] flex-1"
          value={collectionInput}
          onChange={(val) => setCollectionInput(val)}
        />
        {children}
      </div>
      <div className="mb-6 flex gap-2">
        <div className="mt-1 flex-1">
          <ReportTypeMultiselect
            value={filters.reportTypes ?? []}
            onChange={(val) => updateFilter('reportTypes', val)}
          />
        </div>
        <div className="mt-2">
          <ActionButton
            type="button"
            size="md"
            appearance="outlined"
            onClick={() => resetFilters()}
          >
            <p className="text-xs">Reset Filters</p>
          </ActionButton>
        </div>
      </div>
    </>
  )
}
