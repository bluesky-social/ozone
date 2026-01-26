import { Fragment, type ReactNode } from 'react'
import {
  Popover,
  Transition,
  PopoverButton,
  PopoverPanel,
} from '@headlessui/react'
import { QuestionMarkCircleIcon } from '@heroicons/react/24/solid'

export type TooltipProps = {
  title?: string
  description?: string
}

export const Tooltip = ({ title, description }: TooltipProps) => {
  return (
    <Popover className="relative">
      {() => (
        <>
          <PopoverButton className="ring-none h-5">
            <QuestionMarkCircleIcon className="h-6 w-6 dark:fill-teal-500" />
          </PopoverButton>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <PopoverPanel className="absolute left-2 z-20 mt-3 w-72 transform lg:max-w-3xl max-w-sm">
              <div className="overflow-hidden rounded-lg shadow-lg">
                <div className="relative bg-white dark:bg-slate-700 text-gray-500 dark:text-gray-50">
                  <div className="px-4 py-2">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-100 flex flex-row items-center">
                      {title}
                    </h3>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-600 px-4 py-3">
                    <p className="whitespace-pre-wrap">{description}</p>
                  </div>
                </div>
              </div>
            </PopoverPanel>
          </Transition>
        </>
      )}
    </Popover>
  )
}
