import { Fragment, useState } from 'react'
import {
  Combobox,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
  Transition,
} from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/solid'
import { getReasonLabel, groupedReasonTypes } from './helpers/getType'

export function ReasonTypeCombobox({
  selectedReason,
  onSelect,
  query,
  onQueryChange,
  id,
  disabled = false,
  allowCustom = false,
  excludedReasons = [],
}: {
  selectedReason: string
  onSelect: (reason: string) => void
  query: string
  onQueryChange: (query: string) => void
  id?: string
  disabled?: boolean
  allowCustom?: boolean
  excludedReasons?: string[]
}) {
  const [isFocused, setIsFocused] = useState(false)

  // Create a flat list of all reason types with their categories for searching
  const allReasonTypes = Object.entries(groupedReasonTypes).flatMap(
    ([categoryName, reasonTypes]) =>
      reasonTypes.map((reasonType) => ({
        value: reasonType,
        label: getReasonLabel(reasonType),
        category: categoryName,
      })),
  )

  const filteredReasonTypes = allReasonTypes.filter((reason) => {
    if (excludedReasons.includes(reason.value)) return false
    if (!query) return true
    const searchText = query.toLowerCase()
    return (
      reason.label.toLowerCase().includes(searchText) ||
      reason.category.toLowerCase().includes(searchText) ||
      reason.value.toLowerCase().includes(searchText)
    )
  })

  const customReason = query.trim()
  const showCustomReason =
    allowCustom &&
    !!customReason &&
    !excludedReasons.includes(customReason) &&
    !allReasonTypes.some((reason) => reason.value === customReason)

  // Group filtered results by category
  const groupedFilteredResults = filteredReasonTypes.reduce(
    (acc, reason) => {
      acc[reason.category] ??= []
      acc[reason.category].push(reason)
      return acc
    },
    {} as Record<string, typeof filteredReasonTypes>,
  )

  return (
    <Combobox
      value={selectedReason}
      disabled={disabled}
      onChange={(value) => {
        onSelect(value || '')
        setIsFocused(false)
      }}
    >
      <div className="relative mt-1 w-full">
        <div className="relative w-full cursor-default overflow-hidden rounded-md bg-white dark:bg-slate-700 text-left shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm">
          <ComboboxInput
            id={id}
            aria-label="Report reason"
            className="w-full rounded-md border-gray-300 dark:border-teal-500 dark:bg-slate-700 shadow-sm dark:shadow-slate-700 focus:border-indigo-500 focus:ring-indigo-500 dark:focus:ring-teal-500 sm:text-sm dark:text-gray-100"
            onChange={(event) => {
              onSelect('')
              onQueryChange(event.target.value)
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            displayValue={(value: string) => {
              return isFocused ? '' : getReasonLabel(value)
            }}
            placeholder={
              allowCustom
                ? 'Search reasons or enter a custom reason'
                : 'Select reason type. Type to search...'
            }
          />
          <ComboboxButton
            aria-label="Show report reasons"
            className="absolute inset-y-0 right-0 flex items-center pr-2"
          >
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
          afterLeave={() => onQueryChange('')}
        >
          <ComboboxOptions className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
            {Object.keys(groupedFilteredResults).length === 0 &&
            !showCustomReason ? (
              <div className="relative cursor-default select-none px-4 py-2 text-gray-700 dark:text-gray-100">
                No reason types found {query ? `matching "${query}"` : ''}.
              </div>
            ) : (
              Object.entries(groupedFilteredResults).map(
                ([categoryName, reasons]) => (
                  <div key={categoryName}>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-slate-600">
                      {categoryName}
                    </div>
                    {reasons.map((reason) => (
                      <ComboboxOption
                        key={reason.value}
                        className={({ focus }) =>
                          `relative cursor-default select-none py-2 pl-10 pr-4 ${
                            focus
                              ? 'bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-gray-200'
                              : 'text-gray-900 dark:text-gray-200'
                          }`
                        }
                        value={reason.value}
                        onClick={() => setIsFocused(false)}
                      >
                        {({ selected, focus }) => (
                          <>
                            {selected ? (
                              <span
                                className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                  focus ? 'text-indigo-900' : 'text-indigo-600'
                                }`}
                              >
                                <CheckIcon
                                  className="h-5 w-5 dark:text-gray-50"
                                  aria-hidden="true"
                                />
                              </span>
                            ) : null}
                            <span
                              className={`block truncate ${
                                selected ? 'font-medium' : 'font-normal'
                              }`}
                            >
                              {reason.label}
                            </span>
                            {allowCustom && (
                              <span className="block break-all text-xs text-gray-500 dark:text-gray-400">
                                {reason.value}
                              </span>
                            )}
                          </>
                        )}
                      </ComboboxOption>
                    ))}
                  </div>
                ),
              )
            )}
            {showCustomReason && (
              <ComboboxOption
                value={customReason}
                className={({ focus }) =>
                  `cursor-default select-none break-all px-4 py-2 text-sm ${
                    focus ? 'bg-gray-100 dark:bg-slate-600' : ''
                  }`
                }
              >
                Use custom reason: {customReason}
              </ComboboxOption>
            )}
          </ComboboxOptions>
        </Transition>
      </div>
    </Combobox>
  )
}
