import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from '@headlessui/react'
import { useMemo, useState } from 'react'
import { reasonTypeOptions } from './helpers/getType'

type ReasonOption = { value: string; label: string }

const OPTIONS: ReasonOption[] = Object.entries(reasonTypeOptions)
  .map(([value, label]) => ({ value, label }))
  .sort(
    (a, b) => a.label.localeCompare(b.label) || a.value.localeCompare(b.value),
  )

export function ReportReasonSelect({
  value,
  onChange,
}: {
  value: string | undefined
  onChange: (value: string | undefined) => void
}) {
  const [query, setQuery] = useState('')
  const selected = value
    ? (OPTIONS.find((option) => option.value === value) ?? {
        value,
        label: value,
      })
    : null
  const options = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return OPTIONS
    return OPTIONS.filter(
      (option) =>
        option.label.toLowerCase().includes(normalized) ||
        option.value.toLowerCase().includes(normalized),
    )
  }, [query])

  return (
    <Combobox
      value={selected}
      by="value"
      onChange={(option: ReasonOption | null) => onChange(option?.value)}
    >
      <div className="relative w-72">
        <ComboboxInput
          className="block w-full text-sm rounded border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-200"
          displayValue={(option: ReasonOption | null) => option?.label ?? ''}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search report reasons"
        />
        <ComboboxOptions className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-700 py-1 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none">
          {options.map((option) => (
            <ComboboxOption
              key={option.value}
              value={option}
              className="cursor-pointer px-3 py-2 text-gray-900 data-[focus]:bg-blue-50 dark:text-gray-100 dark:data-[focus]:bg-slate-600"
            >
              <div>{option.label}</div>
              <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                {option.value}
              </div>
            </ComboboxOption>
          ))}
        </ComboboxOptions>
      </div>
    </Combobox>
  )
}
