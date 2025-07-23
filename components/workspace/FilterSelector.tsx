import {
  Popover,
  Transition,
  PopoverButton,
  PopoverPanel,
} from '@headlessui/react'
import { ActionButton } from '@/common/buttons'
import { CheckIcon } from '@heroicons/react/24/outline'
import { Input } from '@/common/forms'
import { useState } from 'react'

import { FilterProvider, useFilter } from './FilterContext'
import { WorkspaceListData } from './useWorkspaceListData'
import { DurationUnit, WorkspaceFilterItem } from './types'
import { Dropdown } from '@/common/Dropdown'
import { ChevronDownIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/solid'
import { FilterView } from './FilterView'
import { reviewStateToText } from '@/subject/ReviewStateMarker'
import { AGE_ASSURANCE_STATES } from '@/mod-event/constants'
import { capitalize } from '@/lib/util'

const availableFilters: (Omit<WorkspaceFilterItem, 'value'> &
  Partial<{ unit: DurationUnit }> & {
    text: string
  })[] = [
  { field: 'tag', operator: 'eq', text: 'With Tag' },
  { field: 'tag', operator: 'neq', text: 'Without Tag' },
  { field: 'followersCount', operator: 'gte', text: 'Min. Follower Count' },
  { field: 'followersCount', operator: 'lte', text: 'Max. Follower Count' },
  { field: 'followsCount', operator: 'gte', text: 'Min. Follow Count' },
  { field: 'followsCount', operator: 'lte', text: 'Max. Follow Count' },
  {
    field: 'accountAge',
    operator: 'gte',
    unit: 'days',
    text: 'Min. Account Age',
  }, // ✅ Now allowed
  {
    field: 'accountAge',
    operator: 'lte',
    unit: 'weeks',
    text: 'Max. Account Age',
  },
  { field: 'emailConfirmed', operator: 'eq', text: 'Email Confirmed' },
  { field: 'emailConfirmed', operator: 'neq', text: 'Email Not Confirmed' },
  { field: 'emailContains', operator: 'ilike', text: 'Email Contains' },
  { field: 'displayName', operator: 'ilike', text: 'Display Name' },
  { field: 'description', operator: 'ilike', text: 'Profile Description' },
  { field: 'content', operator: 'ilike', text: 'Record Content' },
  { field: 'reviewState', operator: 'eq', text: 'In Review State' },
  { field: 'reviewState', operator: 'neq', text: 'Not In Review State' },
  {
    field: 'ageAssuranceState',
    operator: 'eq',
    text: 'In Age Assurance State',
  },
  { field: 'takendown', operator: 'eq', text: 'Is Takendown' },
  { field: 'takendown', operator: 'neq', text: 'Not Takendown' },
  { field: 'verifier', operator: 'eq', text: 'Verifier' },
]
const booleanFields = ['emailConfirmed', 'accountDeactivated', 'takendown']
const isBooleanFilter = (field: string) => booleanFields.includes(field)
const durationFields = ['accountAge']
const isDurationFilter = (field: string) => durationFields.includes(field)
const getAvailableOptions = (existingFilters: WorkspaceFilterItem[]) => {
  return availableFilters.filter(
    (f) =>
      !existingFilters.some(
        (existing) =>
          existing.operator === f.operator && existing.field === f.field,
      ),
  )
}

export function FilterSelector({ groupId }: { groupId: number }) {
  const { addFilter, filterGroup } = useFilter()
  const [selected, setSelected] = useState(availableFilters[0])
  const needsUnitField = isDurationFilter(selected.field)
  const [value, setValue] = useState<string | number | boolean>('')
  const [unit, setUnit] = useState<string>(selected.unit || '')

  const handleAddFilter = () => {
    // TODO: Use better validation here
    if (value === undefined) return

    let newFilter: WorkspaceFilterItem

    if (selected.field === 'accountAge') {
      newFilter = {
        field: selected.field,
        operator: selected.operator as 'gte' | 'lte', // Ensure valid operator
        unit: unit as DurationUnit, // Unit is required here
        value: Number(value), // Ensure value is a number
      }
    } else {
      newFilter = {
        field: selected.field,
        operator: selected.operator,
        value:
          typeof value === 'string' && selected.operator === 'ilike'
            ? value.trim()
            : value, // Trim for string searches
      } as WorkspaceFilterItem
    }

    addFilter(groupId, newFilter)
    const availableOptions = getAvailableOptions([...group.filters, newFilter])
    setSelected(availableOptions[0])
    setValue('')
  }

  const group = filterGroup[groupId]
  const availableOptions = getAvailableOptions(group.filters)

  return (
    <div className="flex gap-2 py-1">
      <Dropdown
        className="inline-flex justify-center rounded-md border border-gray-300 dark:border-teal-500 bg-white dark:bg-slate-800 dark:text-gray-100 dark:focus:border-teal-500  dark px-2 py-1 text-xs text-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700"
        items={availableOptions.map((f) => ({
          text: f.text,
          id: f.text,
          onClick: () => {
            setSelected(f)
            if (isDurationFilter(f.field)) {
              setUnit(f.unit || 'days')
            }
            // For boolean filters, we have individual filters for now that come pre-selected with true value
            // so based on eq/neq filter, we can automatically set the true/false value
            if (isBooleanFilter(f.field)) {
              setValue(f.operator === 'eq')
            }
          },
        }))}
      >
        {selected.text}
        <ChevronDownIcon
          className="ml-1 h-4 w-4 text-violet-200 hover:text-violet-100"
          aria-hidden="true"
        />
      </Dropdown>
      {!isBooleanFilter(selected.field) &&
        selected.field !== 'reviewState' &&
        selected.field !== 'ageAssuranceState' && (
          <Input
            className="text-xs py-0.5"
            type="text" // Checkbox for boolean fields
            value={`${value}`} // Ensure only string/number go in text input
            onChange={(e) => setValue(e.target.value)}
          />
        )}
      {selected.field === 'reviewState' && (
        <Dropdown
          className="inline-flex justify-center rounded-md border border-gray-300 dark:border-teal-500 bg-white dark:bg-slate-800 dark:text-gray-100 dark:focus:border-teal-500  dark px-2 py-1 text-xs text-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700"
          items={Object.entries(reviewStateToText).map(([value, text]) => ({
            text,
            id: value,
            onClick: () => setValue(value),
          }))}
        >
          {value ? reviewStateToText[`${value}`] : 'Select Review State'}
          <ChevronDownIcon
            className="ml-1 h-4 w-4 text-violet-200 hover:text-violet-100"
            aria-hidden="true"
          />
        </Dropdown>
      )}
      {selected.field === 'ageAssuranceState' && (
        <Dropdown
          className="inline-flex justify-center rounded-md border border-gray-300 dark:border-teal-500 bg-white dark:bg-slate-800 dark:text-gray-100 dark:focus:border-teal-500  dark px-2 py-1 text-xs text-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700"
          items={Object.entries(AGE_ASSURANCE_STATES).map(([, value]) => ({
            text: capitalize(value),
            id: value,
            onClick: () => setValue(value),
          }))}
        >
          {value ? capitalize(`${value}`) : 'Select Age Assurance State'}
          <ChevronDownIcon
            className="ml-1 h-4 w-4 text-violet-200 hover:text-violet-100"
            aria-hidden="true"
          />
        </Dropdown>
      )}
      {needsUnitField && (
        <Dropdown
          className="inline-flex justify-center rounded-md border border-gray-300 dark:border-teal-500 bg-white dark:bg-slate-800 dark:text-gray-100 dark:focus:border-teal-500  dark px-2 py-1 text-xs text-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700"
          items={['days', 'weeks', 'months', 'years'].map((unit) => ({
            text: unit,
            id: unit,
            onClick: () => {
              setUnit(unit)
            },
          }))}
        >
          <span className="capitalize">{unit}</span>
          <ChevronDownIcon
            className="ml-1 h-4 w-4 text-violet-200 hover:text-violet-100"
            aria-hidden="true"
          />
        </Dropdown>
      )}
      <ActionButton
        size="xs"
        type="button"
        appearance="outlined"
        onClick={handleAddFilter}
        className="text-white bg-blue-600 rounded"
      >
        <PlusIcon className="h-3 w-3 mr-1" />
        <span className="text-xs">Add</span>
      </ActionButton>
    </div>
  )
}

export function FilterGroupComponent() {
  const { filterGroup, addGroup, removeGroup, removeFilter } = useFilter()

  return (
    <div>
      {filterGroup.map((group, groupId) => (
        <div key={groupId} className="my-2">
          <div className="p-2 mb-2 border dark:border-teal-700 rounded">
            <div className="flex flex-row justify-between">
              <h4 className="font-semibold">
                {group.operator && `${group.operator} `}Group: {groupId + 1}
              </h4>

              {groupId > 0 && (
                <ActionButton
                  appearance="outlined"
                  size="xs"
                  type="button"
                  onClick={() => removeGroup(groupId)}
                >
                  <TrashIcon className="h-3 w-3" />
                </ActionButton>
              )}
            </div>

            {group.filters.map((filter) => (
              <div
                key={`${filter.field}-${filter.operator}`}
                className="flex items-start gap-2 py-0.5"
              >
                <FilterView filter={filter} />
                <button
                  onClick={() =>
                    removeFilter(groupId, filter.field, filter.operator)
                  }
                  className="text-red-600"
                  type="button"
                >
                  ✕
                </button>
              </div>
            ))}

            <FilterSelector groupId={groupId} />
          </div>
        </div>
      ))}
      <ActionButton
        size="xs"
        appearance="outlined"
        onClick={() => addGroup('OR')}
      >
        Add OR Group
      </ActionButton>
    </div>
  )
}

const ActionRow = () => {
  const { toggleFilteredItems, unselectAll, selectAll } = useFilter()
  return (
    <div className="flex flex-row mt-2 gap-2">
      <ActionButton
        size="xs"
        appearance="outlined"
        onClick={() => {
          toggleFilteredItems(true)
        }}
      >
        <span className="text-xs">Select Filtered</span>
      </ActionButton>
      <ActionButton
        size="xs"
        appearance="outlined"
        onClick={() => {
          toggleFilteredItems(false)
        }}
      >
        <span className="text-xs">Unselect Filtered</span>
      </ActionButton>
      <ActionButton
        size="xs"
        appearance="outlined"
        onClick={() => {
          unselectAll()
        }}
      >
        <span className="text-xs">Unselect All</span>
      </ActionButton>
      <ActionButton
        size="xs"
        appearance="outlined"
        onClick={() => {
          selectAll()
        }}
      >
        <span className="text-xs">Select All</span>
      </ActionButton>
    </div>
  )
}

export const WorkspaceFilterSelector = ({
  listData,
}: {
  listData: WorkspaceListData | undefined
}) => {
  return (
    <Popover className="relative z-30">
      {({ open }) => (
        <>
          <PopoverButton className="text-sm flex flex-row items-center z-20">
            <ActionButton
              appearance="outlined"
              size="xs"
              type="button"
              title="Select/unselect all items"
            >
              <CheckIcon className="h-4 w-3" />
            </ActionButton>
          </PopoverButton>

          {/* Use the `Transition` component. */}
          <Transition
            show={open}
            enter="transition duration-100 ease-out"
            enterFrom="transform scale-95 opacity-0"
            enterTo="transform scale-100 opacity-100"
            leave="transition duration-75 ease-out"
            leaveFrom="transform scale-100 opacity-100"
            leaveTo="transform scale-95 opacity-0"
          >
            <PopoverPanel className="absolute left-0 z-30 mt-1 flex w-screen max-w-max -translate-x-1/5 px-4">
              <FilterProvider listData={listData}>
                <div className="w-fit-content flex-auto rounded bg-white dark:bg-slate-800 p-4 text-sm leading-6 shadow-lg dark:shadow-slate-900 ring-1 ring-gray-900/5">
                  <FilterGroupComponent />
                  <p className="py-2 block max-w-lg text-gray-500 dark:text-gray-300 text-xs">
                    Account age is computed using profile creation date. Some
                    bots and accounts may not have this set.
                  </p>
                  <ActionRow />
                </div>
              </FilterProvider>
            </PopoverPanel>
          </Transition>
        </>
      )}
    </Popover>
  )
}
