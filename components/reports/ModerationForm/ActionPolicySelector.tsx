import { usePolicyListSetting } from '@/setting/policy/usePolicyList'
import { useServerConfig } from '@/shell/ConfigurationContext'
import { ToolsOzoneTeamDefs } from '@atproto/api'
import {
  Combobox,
  Transition,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
} from '@headlessui/react'
import {
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  ChevronUpDownIcon,
} from '@heroicons/react/24/solid'
import { Fragment, useEffect, useState } from 'react'

export const ActionPolicySelector = ({
  defaultPolicy,
  onSelect,
  name = 'policies',
}: {
  name?: string
  defaultPolicy?: string
  onSelect?: (name: string) => void
}) => {
  const { data, isLoading } = usePolicyListSetting()
  const [selected, setSelected] = useState(defaultPolicy)
  const policyList = Object.values(data?.value || {})

  // If defaultPolicy changes from outside, update selected state
  useEffect(() => {
    setSelected(defaultPolicy)
  }, [defaultPolicy])

  return (
    <>
      <Combobox
        value={selected}
        disabled={isLoading}
        onChange={(selectedPolicy) => {
          setSelected(selectedPolicy || '')
          onSelect?.(selectedPolicy || '')
        }}
      >
        <ActionPolicyList policyList={policyList} />
      </Combobox>
      {/* Hidden input to ensure value is submitted with form */}
      <input type="hidden" name={name} value={selected || ''} />
    </>
  )
}

export const ActionPoliciesSelector = ({
  defaultPolicies,
  onSelect,
  name = 'policies',
}: {
  name?: string
  defaultPolicies?: string[]
  onSelect?: (names: string[]) => void
}) => {
  const { data, isLoading } = usePolicyListSetting()
  const [selected, setSelected] = useState(defaultPolicies)
  const policyList = Object.values(data?.value || {})

  return (
    <>
      <Combobox
        multiple
        value={selected}
        disabled={isLoading}
        onChange={(selectedPolicies) => {
          setSelected(selectedPolicies)
          onSelect?.(selectedPolicies)
        }}
        name={name}
      >
        <ActionPolicyList policyList={policyList} />
      </Combobox>
    </>
  )
}

const ActionPolicyList = ({ policyList }: { policyList: any[] }) => {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const matchingPolicies = policyList
    ?.filter((tpl) => {
      if (query.length) {
        return tpl.name.toLowerCase().includes(query.toLowerCase())
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
          displayValue={(values: string | string[]) => {
            // When focused from blur, display empty value allowing user to input their search query
            return isFocused
              ? ''
              : // when blurred, selected values may be an array of strings or just a string
              // when array, we apply the OR condition between multiple policies so show that
              Array.isArray(values)
              ? values.join(' OR ')
              : values || ''
          }}
          placeholder="Select policy. Type or click arrows to see all policies"
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
          {!matchingPolicies?.length ? (
            <NoPolicyOption query={query} />
          ) : (
            matchingPolicies?.map((tpl) => (
              <ComboboxOption
                key={tpl.name}
                className={({ focus }) =>
                  `relative cursor-default select-none py-2 pl-10 pr-4 ${
                    focus
                      ? 'bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-gray-200'
                      : 'text-gray-900 dark:text-gray-200'
                  }`
                }
                value={tpl.name}
                // Force focus away so that selection is shown in the input field
                // Combobox input will automatically bring focus back
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
                          {tpl.name}
                        </p>
                        <p className="text-xs dark:text-gray-400 text-gray-500">{tpl.description}</p>
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

const NoPolicyOption = ({ query = '' }: { query?: string }) => {
  const isAdmin = useServerConfig().role === ToolsOzoneTeamDefs.ROLEADMIN
  return (
    <div className="relative cursor-default select-none px-4 py-2 text-gray-700 dark:text-gray-100">
      No policy found {query.length ? `matching "${query}"` : ''}.
      {isAdmin && (
        <a
          target="_blank"
          className="underline mx-1"
          href="/configure?tab=policies"
        >
          Add policy
        </a>
      )}
      <ArrowTopRightOnSquareIcon className="h-3 w-3 inline" />
    </div>
  )
}
