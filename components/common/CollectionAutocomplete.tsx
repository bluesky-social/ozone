import { Fragment, useState } from 'react'
import {
  Combobox,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
  Transition,
} from '@headlessui/react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid'
import { getCollectionName, CollectionId } from '@/reports/helpers/subject'
import { validateNsid } from '@/lib/util'

/** Collections that can be the subject of a report on a record. */
const recordCollections: CollectionId[] = [
  CollectionId.Post,
  CollectionId.Profile,
  CollectionId.List,
  CollectionId.FeedGenerator,
  CollectionId.StarterPack,
]
const knownCollections = recordCollections.map((id) => ({
  value: id,
  label: getCollectionName(id),
}))

export function CollectionAutocomplete({
  value,
  id,
  placeholder,
  onChange,
  className,
}: {
  value: string | undefined
  id?: string
  placeholder?: string
  onChange?: (value: string | undefined) => void
  className?: string
}) {
  const [query, setQuery] = useState('')

  const filtered = knownCollections.filter((c) => {
    if (!query) return true
    const q = query.toLowerCase()
    return (
      c.value.toLowerCase().includes(q) || c.label.toLowerCase().includes(q)
    )
  })

  const nsidError = value ? validateNsid(value) : null

  return (
    <Combobox
      value={value ?? ''}
      onChange={(val) => {
        onChange?.(val || undefined)
        setQuery(val || '')
      }}
      immediate
    >
      <div className={`relative ${className ?? ''}`}>
        <div className="relative w-full cursor-default overflow-hidden rounded-md bg-white dark:bg-slate-700 text-left sm:text-sm">
          <ComboboxInput
            id={id}
            className={`w-full rounded-md  dark:bg-slate-700 dark:shadow-slate-700  sm:text-sm dark:text-gray-100 ${nsidError ? 'border-orange-500 focus:border-orange-500' : 'border-gray-300 dark:border-teal-500'}`}
            displayValue={(val: string) => val}
            onChange={(e) => {
              setQuery(e.target.value)
              onChange?.(e.target.value || undefined)
            }}
            onBlur={(e) => {
              const typed = e.target.value
              onChange?.(typed || undefined)
            }}
            placeholder={placeholder}
            autoComplete="off"
          />
          <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
            <MagnifyingGlassIcon
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
          <ComboboxOptions
            className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm"
            hidden={filtered.length === 0}
          >
            {filtered.map((c) => (
              <ComboboxOption
                key={c.value}
                value={c.value}
                className={({ focus }) =>
                  `relative cursor-default select-none py-2 pl-4 pr-4 ${
                    focus
                      ? 'bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-gray-200'
                      : 'text-gray-900 dark:text-gray-200'
                  }`
                }
              >
                <div className="flex justify-between items-center">
                  <span className="block truncate text-sm">{c.label}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                    {c.value}
                  </span>
                </div>
              </ComboboxOption>
            ))}
          </ComboboxOptions>
        </Transition>
      </div>
      {nsidError && <p className="mt-1 text-sm text-orange-500">{nsidError}</p>}
    </Combobox>
  )
}
