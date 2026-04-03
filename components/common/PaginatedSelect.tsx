import { Fragment } from 'react'
import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
  Transition,
} from '@headlessui/react'
import { ChevronUpDownIcon } from '@heroicons/react/24/solid'
import { twMerge } from 'tailwind-merge'

export type PaginatedSelectOption = {
  value: string
  label: string
}

export function PaginatedSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  hasNextPage,
  fetchNextPage,
  className,
}: {
  value: string
  onChange: (value: string) => void
  options: PaginatedSelectOption[]
  placeholder?: string
  hasNextPage?: boolean
  fetchNextPage?: () => void
  className?: string
}) {
  const selected = options.find((o) => o.value === value)

  return (
    <Listbox value={value} onChange={onChange}>
      <div className={twMerge('relative mt-1', className)}>
        <ListboxButton className="relative w-full cursor-default rounded-md dark:bg-slate-700 dark:shadow-slate-700 py-1.5 pl-3 pr-10 text-left sm:text-sm border border-gray-300 dark:border-teal-500 focus:border-indigo-500 focus:ring-indigo-500 dark:focus:ring-teal-500 focus:outline-none focus:ring-1 dark:text-gray-100">
          <span className="block truncate">
            {selected ? selected.label : placeholder}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon
              className="h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
          </span>
        </ListboxButton>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <ListboxOptions className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
            <ListboxOption
              value=""
              className={({ focus }) =>
                `relative cursor-default select-none py-2 pl-4 pr-4 ${
                  focus
                    ? 'bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-gray-200'
                    : 'text-gray-500 dark:text-gray-400'
                }`
              }
            >
              {placeholder}
            </ListboxOption>
            {options.map((opt) => (
              <ListboxOption
                key={opt.value}
                value={opt.value}
                className={({ focus }) =>
                  `relative cursor-default select-none py-2 pl-4 pr-4 ${
                    focus
                      ? 'bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-gray-200'
                      : 'text-gray-900 dark:text-gray-200'
                  }`
                }
              >
                <span className="block truncate text-sm">{opt.label}</span>
              </ListboxOption>
            ))}
            {hasNextPage && fetchNextPage && (
              <li
                className="relative cursor-pointer select-none py-2 pl-4 pr-4 text-center text-xs font-medium text-indigo-600 dark:text-teal-400 hover:bg-gray-100 dark:hover:bg-slate-600"
                onMouseDown={(e) => {
                  e.preventDefault()
                  fetchNextPage()
                }}
              >
                Load more...
              </li>
            )}
          </ListboxOptions>
        </Transition>
      </div>
    </Listbox>
  )
}
