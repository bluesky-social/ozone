import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'

import { ActionButton } from '@/common/buttons'
import { Alert } from '@/common/Alert'

export const ConfirmationModal = ({
  children,
  isOpen = false,
  description,
  title,
  error,
  setIsOpen,
  onConfirm,
  confirmButtonDisabled = false,
  confirmButtonText = 'Confirm',
}: {
  isOpen: boolean
  description?: JSX.Element
  title: string
  children?: React.ReactNode

  error?: string
  onConfirm: () => void
  setIsOpen: (isOpen: boolean) => void
  confirmButtonDisabled?: boolean
  confirmButtonText?: string
}) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-10"
        onClose={() => setIsOpen(false)}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 text-left align-middle shadow-xl dark:shadow-xs dark:shadow-slate-900 transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-50"
                >
                  {title}
                </Dialog.Title>

                {!!description && (
                  <Dialog.Description className="text-gray-600 dark:text-gray-200 mt-4">
                    {description}
                  </Dialog.Description>
                )}
                <Dialog.Description>
                  {children}
                  {!!error && (
                    <Alert
                      type="error"
                      body={error}
                      title="Something went wrong"
                    />
                  )}
                </Dialog.Description>

                <div className="mt-4 flex flex-row justify-end">
                  <ActionButton
                    appearance="outlined"
                    className="mr-2"
                    onClick={() => setIsOpen(false)}
                  >
                    Cancel
                  </ActionButton>
                  <ActionButton
                    appearance="primary"
                    onClick={onConfirm}
                    disabled={confirmButtonDisabled}
                  >
                    {confirmButtonText}
                  </ActionButton>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
