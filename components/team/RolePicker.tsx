'use client'

import { useState, Fragment } from 'react'
import { Combobox, Transition } from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/solid'
import { getRoleText, MemberRoleNames } from './helpers'

interface RolePickerProps {
  values?: string[]
  onChange?: (selectedRoles: string[]) => void
  size?: 'sm' | 'md' | 'lg'
}

const roles = Object.keys(MemberRoleNames)

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-3 text-base',
}

export default function RolePicker({
  values = [],
  onChange,
  size = 'md',
}: RolePickerProps) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(values)

  return (
    <Combobox
      value={selectedRoles}
      onChange={(roles) => {
        setSelectedRoles(roles)
        onChange?.(roles)
      }}
      multiple
    >
      <div className="relative w-full">
        {/* Dropdown Button */}
        <Combobox.Button
          className={`relative w-full cursor-pointer rounded bg-white dark:bg-slate-800 dark:hover:bg-slate-700 text-left shadow-sm border border-gray-300 dark:border-teal-500 flex items-center justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm dark:text-gray-100 ${sizeClasses[size]}`}
        >
          <span className={sizeClasses[size]}>
            {selectedRoles.length > 0
              ? selectedRoles.map(getRoleText).join(', ')
              : 'Select Roles'}
          </span>
          <ChevronUpDownIcon
            className="h-5 w-5 text-gray-400"
            aria-hidden="true"
          />
        </Combobox.Button>

        {/* Dropdown Menu */}
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Combobox.Options className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
            {roles.length === 0 ? (
              <div className="p-2 text-gray-500 dark:text-gray-300">
                No roles available
              </div>
            ) : (
              roles.map((role) => (
                <Combobox.Option
                  key={role}
                  value={role}
                  className={({ active }) =>
                    `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                      active
                        ? 'bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-gray-200'
                        : 'text-gray-900 dark:text-gray-200'
                    }`
                  }
                >
                  {({ selected }) => (
                    <>
                      {selected && (
                        <span
                          className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                            selected ? 'text-indigo-900' : 'text-indigo-600'
                          }`}
                        >
                          <CheckIcon
                            className="h-5 w-5 dark:text-gray-50"
                            aria-hidden="true"
                          />
                        </span>
                      )}
                      <span
                        className={`block truncate ${
                          selected ? 'font-medium' : 'font-normal'
                        }`}
                      >
                        {getRoleText(role)}
                      </span>
                    </>
                  )}
                </Combobox.Option>
              ))
            )}
          </Combobox.Options>
        </Transition>
      </div>
    </Combobox>
  )
}
