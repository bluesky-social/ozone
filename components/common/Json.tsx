'use client'
import { useState } from 'react'
import { ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/20/solid'
import { classNames } from '../../lib/util'

export function Json({ label, value }: { label: string; value: any }) {
  const [open, setOpen] = useState(false)
  const onToggle = () => setOpen(!open)
  return (
    <>
      <div
        className={classNames(
          'flex items-center rounded-t-lg bg-white border border-gray-200 px-2 py-2 sm:px-4 sm:py-3 text-sm cursor-pointer',
          open ? 'rounded-t-lg' : 'rounded-lg'
        )}
        onClick={onToggle}
      >
        {open ? (
          <ChevronDownIcon className="w-4 h-4 mr-1 mt-0.5" />
        ) : (
          <ChevronRightIcon className="w-4 h-4 mr-1 mt-0.5" />
        )}
        {label}
      </div>
      {open ? (
        <div className="rounded-b-lg bg-gray-50 border border-t-0 border-gray-200 px-4 py-5 sm:p-6 font-mono whitespace-pre overflow-x-scroll text-xs">
          {JSON.stringify(value, null, 2)}
        </div>
      ) : undefined}
    </>
  )
}
