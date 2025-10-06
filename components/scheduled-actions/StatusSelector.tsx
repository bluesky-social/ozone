'use client'
import { Fragment, useState } from 'react'
import {
  Combobox,
  Transition,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
} from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/solid'
import { classNames } from '@/lib/util'

interface StatusOption {
  value: string
  label: string
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'executed', label: 'Executed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'failed', label: 'Failed' },
]

interface StatusSelectorProps {
  selectedStatuses: string[]
  onStatusChange: (statuses: string[]) => void
}

export function StatusSelector({
  selectedStatuses,
  onStatusChange,
}: StatusSelectorProps) {
  const [query, setQuery] = useState('')

  const handleStatusToggle = (statusValue: string) => {
    const isSelected = selectedStatuses.includes(statusValue)

    if (isSelected) {
      // dont allow deselecting all statuses
      if (selectedStatuses.length === 1) {
        return
      }
      onStatusChange(selectedStatuses.filter((s) => s !== statusValue))
    } else {
      onStatusChange([...selectedStatuses, statusValue])
    }
  }

  const getDisplayText = () => {
    if (selectedStatuses.length === STATUS_OPTIONS.length) {
      return 'All Statuses'
    }
    if (selectedStatuses.length === 1) {
      const option = STATUS_OPTIONS.find(
        (opt) => opt.value === selectedStatuses[0],
      )
      return option?.label || selectedStatuses[0]
    }
    return `${selectedStatuses.length} selected`
  }

  const filteredOptions = STATUS_OPTIONS.filter((option) =>
    option.label.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <Combobox value={selectedStatuses} onChange={() => {}} multiple>
      <div className="relative mt-1 w-full">
        <div className="relative w-full cursor-default overflow-hidden rounded-md bg-white dark:bg-slate-700 text-left shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm">
          <ComboboxInput
            className="w-full rounded-md border-gray-300 dark:border-teal-500 dark:bg-slate-700 shadow-sm dark:shadow-slate-700 focus:border-indigo-500 focus:ring-indigo-500 dark:focus:ring-teal-500 sm:text-sm dark:text-gray-100"
            onChange={(event) => setQuery(event.target.value)}
            displayValue={() => getDisplayText()}
            placeholder="Filter statuses..."
          />
          <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon
              className="h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
          </ComboboxButton>
        </div>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          afterLeave={() => setQuery('')}
        >
          <ComboboxOptions className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
            {filteredOptions.length === 0 ? (
              <div className="relative cursor-default select-none px-4 py-2 text-gray-700 dark:text-gray-100">
                No statuses found {query ? `matching "${query}"` : ''}.
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selectedStatuses.includes(option.value)
                const isLastSelected = selectedStatuses.length === 1 && isSelected

                return (
                  <ComboboxOption
                    key={option.value}
                    className={({ focus }) =>
                      classNames(
                        focus
                          ? 'bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-gray-200'
                          : 'text-gray-900 dark:text-gray-200',
                        'relative cursor-default select-none py-2 pl-10 pr-4',
                        isLastSelected ? 'opacity-50 cursor-not-allowed' : '',
                      )
                    }
                    value={option.value}
                    onClick={(e) => {
                      e.preventDefault()
                      if (!isLastSelected) {
                        handleStatusToggle(option.value)
                      }
                    }}
                  >
                    {({ selected, focus }) => (
                      <>
                        {isSelected ? (
                          <span
                            className={classNames(
                              focus ? 'text-indigo-900' : 'text-indigo-600 dark:text-teal-600',
                              'absolute inset-y-0 left-0 flex items-center pl-3',
                            )}
                          >
                            <CheckIcon
                              className="h-5 w-5"
                              aria-hidden="true"
                            />
                          </span>
                        ) : null}
                        <span
                          className={classNames(
                            isSelected ? 'font-medium' : 'font-normal',
                            'block truncate',
                          )}
                        >
                          {option.label}
                        </span>
                      </>
                    )}
                  </ComboboxOption>
                )
              })
            )}
          </ComboboxOptions>
        </Transition>
      </div>
    </Combobox>
  )
}