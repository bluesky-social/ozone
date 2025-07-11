'use client'
import { useState, Fragment } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ToolsOzoneSafelinkDefs } from '@atproto/api'
import { ActionButton } from '@/common/buttons'
import { FormLabel, Select, Textarea } from '@/common/forms'
import { Card } from '@/common/Card'
import {
  XMarkIcon,
  CheckIcon,
  ChevronUpDownIcon,
} from '@heroicons/react/24/outline'
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Transition,
} from '@headlessui/react'
import {
  createSafelinkPageLink,
  PatternTypeNames,
  ActionTypeNames,
} from './helpers'
import { SafelinkView } from '@/config/Safelink'

interface FilterPanelProps {
  isOpen: boolean
  onClose: () => void
  view: string
}

export function SafelinkFilterPanel({
  isOpen,
  onClose,
  view,
}: FilterPanelProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get current filter values from URL
  const currentPattern = searchParams.get('pattern') || ''
  const currentUrls = searchParams.get('urls') || ''
  const currentActions = searchParams.get('actions') || ''

  // Local state for form values
  const [pattern, setPattern] = useState<string>(currentPattern)
  const [urls, setUrls] = useState<string>(currentUrls)
  const [selectedActions, setSelectedActions] = useState<string[]>(
    currentActions
      ? currentActions
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean)
      : [],
  )
  const [actionQuery, setActionQuery] = useState('')

  const isEventsView = view === SafelinkView.Events

  const handleApplyFilters = () => {
    const params: any = { view }

    if (pattern) params.pattern = pattern
    if (urls.trim())
      params.urls = urls
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean)
    if (selectedActions.length > 0 && !isEventsView)
      params.actions = selectedActions

    const url = createSafelinkPageLink(params)
    router.push(url, { scroll: false })
    onClose()
  }

  const handleClearFilters = () => {
    setPattern('')
    setUrls('')
    setSelectedActions([])
    setActionQuery('')

    const url = createSafelinkPageLink({ view })
    router.push(url, { scroll: false })
    onClose()
  }

  const availableActions = Object.entries(ActionTypeNames)
  const filteredActions =
    actionQuery === ''
      ? availableActions
      : availableActions.filter(
          ([value, label]) =>
            label.toLowerCase().includes(actionQuery.toLowerCase()) ||
            value.toLowerCase().includes(actionQuery.toLowerCase()),
        )

  const hasActiveFilters =
    currentPattern || currentUrls || (!isEventsView && currentActions)

  if (!isOpen) return null

  return (
    <Card className="mb-4">
      <div className="p-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Filter {isEventsView ? 'Events' : 'Rules'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div
            className={`grid gap-4 ${
              !isEventsView ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
            }`}
          >
            <div>
              <FormLabel label="Pattern Type" htmlFor="pattern-filter" />
              <Select
                id="pattern-filter"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                className="w-full"
              >
                <option value="">All Patterns</option>
                {Object.entries(PatternTypeNames).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>

            {!isEventsView && (
              <div>
                <FormLabel label="Action Types" />
                <Combobox
                  value={selectedActions}
                  onChange={setSelectedActions}
                  multiple
                  data-cy="safelink-action-combobox"
                >
                  <div className="relative">
                    <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-left shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm">
                      <ComboboxInput
                        className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 dark:text-gray-100 bg-transparent focus:ring-0"
                        displayValue={() =>
                          selectedActions.length === 0
                            ? 'Select actions...'
                            : selectedActions
                                .map((action) => ActionTypeNames[action])
                                .join(', ')
                        }
                        onChange={(event) => setActionQuery(event.target.value)}
                        placeholder="Select actions..."
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
                      afterLeave={() => setActionQuery('')}
                    >
                      <ComboboxOptions className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-10">
                        {filteredActions.length === 0 && actionQuery !== '' ? (
                          <div className="relative cursor-default select-none py-2 px-4 text-gray-700 dark:text-gray-300">
                            Nothing found.
                          </div>
                        ) : (
                          filteredActions.map(([value, label]) => (
                            <ComboboxOption
                              key={value}
                              className={({ active }) =>
                                `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                  active
                                    ? 'bg-teal-600 text-white'
                                    : 'text-gray-900 dark:text-gray-100'
                                }`
                              }
                              value={value}
                            >
                              {({ selected, active }) => (
                                <>
                                  <span
                                    className={`block truncate ${
                                      selected ? 'font-medium' : 'font-normal'
                                    }`}
                                  >
                                    {label}
                                  </span>
                                  {selected ? (
                                    <span
                                      className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                        active ? 'text-white' : 'text-teal-600'
                                      }`}
                                    >
                                      <CheckIcon
                                        className="h-5 w-5"
                                        aria-hidden="true"
                                      />
                                    </span>
                                  ) : null}
                                </>
                              )}
                            </ComboboxOption>
                          ))
                        )}
                      </ComboboxOptions>
                    </Transition>
                  </div>
                </Combobox>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Select multiple actions
                </div>
              </div>
            )}
          </div>

          <div>
            <FormLabel label="URLs/Domains" htmlFor="urls-filter" />
            <Textarea
              id="urls-filter"
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder="example.com, https://malicious.com, suspicious.org"
              rows={3}
              className="w-full text-sm"
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Enter comma separated URLs or domains
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <ActionButton
            size="sm"
            appearance="primary"
            onClick={handleApplyFilters}
          >
            Apply
          </ActionButton>
          <ActionButton
            size="sm"
            appearance="outlined"
            onClick={handleClearFilters}
            disabled={!hasActiveFilters}
          >
            Clear
          </ActionButton>
          <ActionButton size="sm" appearance="outlined" onClick={onClose}>
            Cancel
          </ActionButton>
        </div>
      </div>
    </Card>
  )
}
