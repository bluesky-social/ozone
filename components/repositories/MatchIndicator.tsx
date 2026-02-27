import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid'
import { Fragment, useState } from 'react'

export type MatchIndicatorProps = {
  exact?: boolean
  description?: string
}

export const MatchIndicator = ({ description, exact }: MatchIndicatorProps) => {
  const [isOpen, setIsOpen] = useState(false)

  if (exact) {
    return (
      <Popover className="relative whitespace-pre-wrap">
        <PopoverButton className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 dark:text-blue-400 dark:bg-blue-900 dark:hover:bg-blue-800">
          {description}
        </PopoverButton>
      </Popover>
    )
  }

  return (
    <Popover className="relative whitespace-pre-wrap">
      <PopoverButton
        as="button"
        type="button"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
      >
        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 dark:text-yellow-400 cursor-help" />
      </PopoverButton>
      <Transition
        show={isOpen}
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <PopoverPanel static anchor="right start">
          <div className="rounded-lg shadow-lg bg-gray-900 dark:bg-gray-800 text-white px-3 py-2">
            <p className="text-sm">{description}</p>
          </div>
        </PopoverPanel>
      </Transition>
    </Popover>
  )
}
