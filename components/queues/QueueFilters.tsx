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
  hiddenFilters,
  className,
}: {
  filters: QueueListFilters
  onChange: (filters: QueueListFilters) => void
  children?: React.ReactNode
  hiddenFilters?: (keyof QueueListFilters)[]
  className?: string
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
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        <Select
          className="h-fit text-xs"
          hidden={hiddenFilters?.includes('enabled')}
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
          hidden={hiddenFilters?.includes('subjectType')}
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
        <div hidden={hiddenFilters?.includes('collection')} className="flex-1">
          <CollectionAutocomplete
            className="min-w-[10rem]"
            value={collectionInput}
            onChange={(val) => setCollectionInput(val)}
          />
        </div>
        {children}
      </div>
      <div className="flex gap-2">
        <div
          className="mt-1 flex-1"
          hidden={hiddenFilters?.includes('reportTypes')}
        >
          <ReportTypeMultiselect
            value={filters.reportTypes ?? []}
            limit={10}
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
    </div>
  )
}
