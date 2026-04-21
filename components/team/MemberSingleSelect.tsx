'use client'

import { useState } from 'react'
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Combobox,
  ComboboxInput,
  ComboboxOptions,
  ComboboxOption,
} from '@headlessui/react'
import { ChevronUpDownIcon } from '@heroicons/react/24/solid'
import { useMemberList } from './useMemberList'
import { twMerge } from 'tailwind-merge'

export function MemberSingleSelect({
  value,
  onChange,
  label = 'All Moderators',
  className,
}: {
  value: string | undefined
  onChange: (did: string | undefined) => void
  label?: string
  className?: string
}) {
  const [query, setQuery] = useState('')
  const { data } = useMemberList(query)
  const members = data?.pages?.flatMap((page) => page.members) ?? []

  const { data: allData } = useMemberList()
  const allMembers = allData?.pages?.flatMap((page) => page.members) ?? []
  const selected = value ? allMembers.find((m) => m.did === value) : undefined
  const displayLabel = selected
    ? selected.profile?.displayName || selected.profile?.handle || selected.did
    : label

  return (
    <Popover className="relative">
      <PopoverButton
        className={twMerge(
          'w-[150px] flex items-center justify-between text-sm rounded border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-200 bg-white px-2 py-1.5',
          className,
        )}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronUpDownIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
      </PopoverButton>
      <PopoverPanel className="absolute z-30 mt-1 w-64 bg-white dark:bg-slate-800 rounded-md shadow-lg ring-1 ring-black/5 p-2">
        {({ close }) => (
          <>
            <Combobox
              onChange={(did: string | null) => {
                onChange(did || undefined)
                setQuery('')
                close()
              }}
            >
              <ComboboxInput
                className="w-full rounded border border-gray-300 dark:border-teal-500 dark:bg-slate-700 px-2 py-1 text-sm dark:text-gray-100"
                placeholder="Search members..."
                onChange={(e) => setQuery(e.target.value)}
                value={query}
              />
              <ComboboxOptions static className="mt-1 max-h-48 overflow-auto">
                {members.map((member) => (
                  <ComboboxOption
                    key={member.did}
                    value={member.did}
                    className="cursor-pointer px-2 py-1 text-sm rounded data-[focus]:bg-gray-100 dark:data-[focus]:bg-slate-600 dark:text-gray-100"
                  >
                    {member.profile?.displayName ||
                      member.profile?.handle ||
                      member.did.slice(0, 20)}
                  </ComboboxOption>
                ))}
                {members.length === 0 && query && (
                  <div className="px-2 py-1 text-sm text-gray-500">
                    No members found
                  </div>
                )}
              </ComboboxOptions>
            </Combobox>
            {value && (
              <button
                type="button"
                className="w-full mt-1 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-left"
                onClick={() => {
                  onChange(undefined)
                  setQuery('')
                  close()
                }}
              >
                Clear selection
              </button>
            )}
          </>
        )}
      </PopoverPanel>
    </Popover>
  )
}
