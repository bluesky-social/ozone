import { useSeverityLevelSetting } from '@/setting/severity-level/useSeverityLevel'
import {
  Combobox,
  Transition,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
} from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/solid'
import { Fragment, useState, useEffect } from 'react'

export const ActionSeverityLevelSelector = ({
  defaultSeverityLevel,
  onSelect,
  name = 'severityLevel',
  policySeverityLevels,
}: {
  name?: string
  defaultSeverityLevel?: string
  onSelect?: (name: string) => void
  policySeverityLevels?: string[]
}) => {
  const { data, isLoading } = useSeverityLevelSetting()
  const [selected, setSelected] = useState(defaultSeverityLevel)
  const severityLevelList = Object.values(data?.value || {})

  // Auto-select first severity level from policy when policy changes
  useEffect(() => {
    if (policySeverityLevels && policySeverityLevels.length > 0) {
      const firstLevel = policySeverityLevels[0]
      setSelected(firstLevel)
      onSelect?.(firstLevel)
    } else {
      setSelected('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policySeverityLevels])

  return (
    <>
      <Combobox
        value={selected}
        disabled={isLoading}
        onChange={(selectedLevel) => {
          setSelected(selectedLevel || '')
          onSelect?.(selectedLevel || '')
        }}
      >
        <ActionSeverityLevelList severityLevelList={severityLevelList} />
      </Combobox>
      {/* Hidden input to ensure value is submitted with form */}
      <input type="hidden" name={name} value={selected || ''} />
    </>
  )
}

const ActionSeverityLevelList = ({
  severityLevelList,
}: {
  severityLevelList: any[]
}) => {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const matchingSeverityLevels = severityLevelList
    ?.filter((level) => {
      if (query.length) {
        return level.name.toLowerCase().includes(query.toLowerCase())
      }

      return true
    })
    .sort((prev, next) => prev.name.localeCompare(next.name))

  return (
    <div className="relative mt-1 w-full">
      <div className="relative w-full cursor-default overflow-hidden rounded-md bg-white dark:bg-slate-700 text-left shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm">
        <ComboboxInput
          className="w-full rounded-md border-gray-300 dark:border-teal-500 dark:bg-slate-700 shadow-sm dark:shadow-slate-700 focus:border-indigo-500 focus:ring-indigo-500 dark:focus:ring-teal-500 sm:text-sm dark:text-gray-100"
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          displayValue={(value: string) => {
            return isFocused ? '' : value || ''
          }}
          placeholder="Select severity level. Type or click arrows to see all"
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
          {!matchingSeverityLevels?.length ? (
            <div className="relative cursor-default select-none px-4 py-2 text-gray-700 dark:text-gray-100">
              No severity level found {query.length ? `matching "${query}"` : ''}
              .
            </div>
          ) : (
            matchingSeverityLevels?.map((level) => (
              <ComboboxOption
                key={level.name}
                className={({ focus }) =>
                  `relative cursor-default select-none py-2 pl-10 pr-4 ${
                    focus
                      ? 'bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-gray-200'
                      : 'text-gray-900 dark:text-gray-200'
                  }`
                }
                value={level.name}
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
                    <div className="flex flex-row">
                      <div>
                        <p
                          className={`block truncate ${
                            selected ? 'font-medium' : 'font-normal'
                          }`}
                        >
                          {level.name}
                        </p>
                        <p className="text-xs">{level.description}</p>
                        {level.strikeCount !== undefined && (
                          <p className="text-xs text-orange-600 dark:text-orange-400">
                            Strike Count: {level.strikeCount}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </ComboboxOption>
            ))
          )}
        </ComboboxOptions>
      </Transition>
    </div>
  )
}
