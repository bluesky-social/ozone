import { SeverityLevelListSetting } from '@/setting/severity-level/types'
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
  policySeverityLevels?: Record<
    string,
    { description: string; isDefault: boolean }
  >
}) => {
  const { data, isLoading } = useSeverityLevelSetting()
  const [selected, setSelected] = useState(defaultSeverityLevel)

  // Auto-select default severity level from policy when policy changes
  useEffect(() => {
    if (policySeverityLevels && Object.keys(policySeverityLevels).length > 0) {
      // Find the default level
      const defaultLevel = Object.entries(policySeverityLevels).find(
        ([_, config]) => config.isDefault,
      )
      const levelToSelect = defaultLevel
        ? defaultLevel[0]
        : Object.keys(policySeverityLevels)[0] // fallback to first if no default

      setSelected(levelToSelect)
      onSelect?.(levelToSelect)
    } else {
      setSelected('')
    }
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
        <ActionSeverityLevelList
          severityLevelList={data?.value || {}}
          policySeverityLevels={policySeverityLevels}
        />
      </Combobox>
      {/* Hidden input to ensure value is submitted with form */}
      <input type="hidden" name={name} value={selected || ''} />
    </>
  )
}

const ActionSeverityLevelList = ({
  severityLevelList,
  policySeverityLevels,
}: {
  severityLevelList: SeverityLevelListSetting
  policySeverityLevels?: Record<
    string,
    { description: string; isDefault: boolean }
  >
}) => {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const matchingSeverityLevels = Object.entries(severityLevelList)
    ?.filter(([name, level]) => {
      if (query.length) {
        const q = query.toLowerCase()
        return (
          name.toLowerCase().includes(q) ||
          level.description?.toLowerCase().includes(q)
        )
      }

      return true
    })
    .sort(([prev], [next]) => prev.localeCompare(next))

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
              No severity level found{' '}
              {query.length ? `matching "${query}"` : ''}.
            </div>
          ) : (
            matchingSeverityLevels?.map(([key, level]) => (
              <ComboboxOption
                key={key}
                className={({ focus }) =>
                  `relative cursor-default select-none py-2 pl-10 pr-4 ${
                    focus
                      ? 'bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-gray-200'
                      : 'text-gray-900 dark:text-gray-200'
                  }`
                }
                value={key}
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
                    <div className="flex flex-col">
                      <div className="flex flex-row items-baseline gap-2">
                        <span
                          className={`${
                            selected ? 'font-medium' : 'font-normal'
                          }`}
                        >
                          {key}
                        </span>
                        {level.strikeCount !== undefined && (
                          <span className="text-xs text-orange-600 dark:text-orange-400">
                            {level.strikeCount} strike
                            {level.strikeCount !== 1 ? 's' : ''}
                          </span>
                        )}
                        {level.expiryInDays !== undefined && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            expires {level.expiryInDays}d
                          </span>
                        )}
                        {level.needsTakedown && (
                          <span className="text-xs text-red-600 dark:text-red-400 font-semibold">
                            immediate ban
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        {policySeverityLevels?.[key]?.description ||
                          level.description}
                      </p>
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
