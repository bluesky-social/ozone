import { Fragment, ReactNode } from 'react'
import {
  Dialog,
  Transition,
  DialogPanel,
  DialogTitle,
  TransitionChild,
} from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'

export function FullScreenActionPanel(props: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children?: ReactNode
}) {
  const { open, onClose, title, children } = props
  return (
    <Transition show={open} as={Fragment}>
      {/* The z-30 value is important because the headerbar uses z-10 and label chips with dropdowns use z-20 and we ant to make sure the full screen panels are never below the header bar and label chip dropdowns */}
      <Dialog
        as="div"
        className="fixed z-30 inset-0 overflow-y-auto"
        onClose={onClose}
      >
        <TransitionChild
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </TransitionChild>
        <div className="fixed inset-0 overflow-hidden flex items-center justify-center transform transition-all sm:my-8 sm:align-middle">
          <TransitionChild
            as={Fragment}
            enter="ease-in-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in-out duration-300"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="max-w-screen-xl w-full sm:w-5/6 h-full md:max-h-3/4 md:my-12 align-bottom bg-white dark:bg-slate-900 rounded-lg text-left sm:overflow-hidden shadow-xl transform transition-all sm:align-middle flex">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  type="button"
                  className="rounded-md text-gray-300 dark:text-gray-50 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                  onClick={onClose}
                >
                  <span className="sr-only">Close panel</span>
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
              <div className="bg-white dark:bg-slate-900 px-4 pt-5 pb-4 sm:p-6 sm:pb-4 flex flex-col flex-1">
                {title && (
                  <div className="sm:flex sm:items-start">
                    {typeof title !== 'string' && title}
                    {typeof title === 'string' && (
                      <DialogTitle className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-200">
                        {title}
                      </DialogTitle>
                    )}
                  </div>
                )}
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-50 flex flex-1 flex-col align-center">
                  {children}
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}
