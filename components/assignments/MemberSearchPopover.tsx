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
import { PlusIcon } from '@heroicons/react/24/outline'
import { useMemberList } from '@/team/useMemberList'

interface MemberSearchPopoverProps {
  onSelect: (did: string) => void
  buttonLabel?: string
  className?: string
}

export function MemberSearchPopover({
  onSelect,
  buttonLabel = 'Add Assignee',
  className,
}: MemberSearchPopoverProps) {
  const [query, setQuery] = useState('')
  const { data } = useMemberList(query)
  const members = data?.pages?.flatMap((page) => page.members) ?? []

  return (
    <Popover className={`relative ${className ?? ''}`}>
      <PopoverButton className="text-xs text-indigo-600 dark:text-teal-400 hover:underline flex items-center gap-1">
        <PlusIcon className="h-4 w-4" />
        {buttonLabel}
      </PopoverButton>
      <PopoverPanel className="absolute z-30 mt-1 w-64 bg-white dark:bg-slate-800 rounded-md shadow-lg ring-1 ring-black/5 p-2">
        {({ close }) => (
          <Combobox
            onChange={(did: string | null) => {
              if (did) {
                onSelect(did)
                setQuery('')
                close()
              }
            }}
          >
            <ComboboxInput
              className="w-full rounded border border-gray-300 dark:border-teal-500 dark:bg-slate-700 px-2 py-1 text-sm dark:text-gray-100"
              placeholder="Search members..."
              onChange={(e) => setQuery(e.target.value)}
              value={query}
            />
            <ComboboxOptions
              static
              className="mt-1 max-h-48 overflow-auto"
            >
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
        )}
      </PopoverPanel>
    </Popover>
  )
}
