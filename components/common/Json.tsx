'use client'
import { ReactNode, useState } from 'react'
import { ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/20/solid'
import { classNames } from '@/lib/util'

export function Json({
  label,
  value,
  className,
}: {
  label: ReactNode
  value: any
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const onToggle = () => setOpen(!open)
  return (
    <div className={className}>
      <div
        className={classNames(
          'flex items-center rounded-t-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-2 py-2 sm:px-4 sm:py-3 text-sm cursor-pointer dark:text-gray-200',
          open ? 'rounded-t-lg' : 'rounded-lg',
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
        <div className="rounded-b-lg bg-gray-50 dark:bg-slate-700 border border-t-0 border-gray-200 dark:border-slate-600 dark:bg-slate-700 px-4 py-5 sm:p-6 font-mono whitespace-pre overflow-x-scroll text-xs dark:text-gray-300">
          {JSON.stringify(value, null, 2)}
        </div>
      ) : undefined}
    </div>
  )
}
