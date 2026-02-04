import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react'
import {
  ExclamationTriangleIcon,
  MagnifyingGlassCircleIcon,
} from '@heroicons/react/24/solid'
import { Fragment, useState } from 'react'

export type MatchIndicatorProps = {
  description: string
  exact?: boolean
}

export const MatchIndicator = ({ description, exact }: MatchIndicatorProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const Icon = exact ? MagnifyingGlassCircleIcon : ExclamationTriangleIcon
  const iconColor = exact
    ? 'text-blue-500 dark:text-blue-400'
    : 'text-yellow-500 dark:text-yellow-400'

  return (
    <Popover className="relative whitespace-pre-wrap">
      <div
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <PopoverButton as="div">
          <Icon className={`h-5 w-5 ${iconColor} cursor-help`} />
        </PopoverButton>
      </div>
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
