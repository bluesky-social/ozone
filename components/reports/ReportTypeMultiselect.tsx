import { Fragment, useState } from 'react'
import {
  Combobox,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
  Transition,
} from '@headlessui/react'
import {
  CheckIcon,
  ChevronUpDownIcon,
  XMarkIcon,
} from '@heroicons/react/24/solid'
import { reasonTypeOptions, groupedReasonTypes } from './helpers/getType'
import { ReasonBadge } from './ReasonBadge'

function useReasonTypeSearch(query: string) {
  const all = Object.entries(groupedReasonTypes).flatMap(([category, types]) =>
    types.map((value) => ({
      value,
      label: reasonTypeOptions[value] || value,
      category,
    })),
  )

  const filtered = all.filter((r) => {
    if (!query) return true
    const q = query.toLowerCase()
    return (
      r.label.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q) ||
      r.value.toLowerCase().includes(q)
    )
  })

  const grouped = filtered.reduce(
    (acc, r) => {
      acc[r.category] ??= []
      acc[r.category].push(r)
      return acc
    },
    {} as Record<string, typeof filtered>,
  )

  return grouped
}

function OptionList({
  grouped,
  query,
}: {
  grouped: Record<string, { value: string; label: string; category: string }[]>
  query: string
}) {
  if (Object.keys(grouped).length === 0) {
    return (
      <div className="relative cursor-default select-none px-4 py-2 text-gray-700 dark:text-gray-100">
        No reason types found{query ? ` matching "${query}"` : ''}.
      </div>
    )
  }

  return (
    <>
      {Object.entries(grouped).map(([category, reasons]) => (
        <div key={category}>
          <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-slate-600">
            {category}
          </div>
          {reasons.map((reason) => (
            <ComboboxOption
              key={reason.value}
              value={reason.value}
              className={({ focus }) =>
                `relative cursor-default select-none py-2 pl-10 pr-4 ${
                  focus
                    ? 'bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-gray-200'
                    : 'text-gray-900 dark:text-gray-200'
                }`
              }
            >
              {({ selected, focus }) => (
                <>
                  {selected && (
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
                  )}
                  <span
                    className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}
                  >
                    {reason.label}
                  </span>
                </>
              )}
            </ComboboxOption>
          ))}
        </div>
      ))}
    </>
  )
}

export function ReportTypeMultiselect({
  value,
  onChange,
  limit = 25,
  className,
  'data-cy': dataCy,
}: {
  value: string[]
  onChange: (values: string[]) => void
  limit?: number
  className?: string
  'data-cy'?: string
}) {
  const [query, setQuery] = useState('')
  const [limitWarning, setLimitError] = useState(false)
  const grouped = useReasonTypeSearch(query)

  const handleChange = (vals: string[]) => {
    if (vals.length > limit) {
      setLimitError(true)
      return
    }
    setLimitError(false)
    onChange(vals)
  }

  return (
    <div className={className}>
      <Combobox value={value} onChange={handleChange} multiple>
        <div className="relative">
          <div className="relative w-full min-w-56 cursor-default overflow-hidden rounded-md bg-white dark:bg-slate-700 text-left shadow-sm focus:outline-none sm:text-sm">
            <ComboboxInput
              className={`w-full rounded-md border-gray-300 dark:border-teal-500 dark:bg-slate-700 shadow-sm dark:shadow-slate-700 focus:border-indigo-500 focus:ring-indigo-500 dark:focus:ring-teal-500 sm:text-sm dark:text-gray-100 ${limitWarning ? 'placeholder:text-yellow-600' : ''}`}
              data-cy={dataCy}
              onChange={(e) => setQuery(e.target.value)}
              onBlur={() => {
                setQuery('')
                setLimitError(false)
              }}
              value={query}
              placeholder={
                limitWarning
                  ? `Maximum of ${limit} types allowed`
                  : value.length
                    ? `${value.length} selected — type to search`
                    : 'Select report types — type to search'
              }
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
              <OptionList grouped={grouped} query={query} />
            </ComboboxOptions>
          </Transition>
        </div>
      </Combobox>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {value.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange(value.filter((x) => x !== v))}
              className="inline-flex items-center gap-0.5 group"
              title={`Remove ${v}`}
            >
              <ReasonBadge reasonType={v} />
              <XMarkIcon className="h-3 w-3 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 -ml-0.5" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
