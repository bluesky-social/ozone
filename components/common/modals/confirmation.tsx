import {
  Dialog,
  Transition,
  DialogTitle,
  Description,
  DialogPanel,
  TransitionChild,
} from '@headlessui/react'
import { ForwardedRef, forwardRef, Fragment, type JSX } from 'react'
import { Alert } from '@/common/Alert'
import { ActionButton } from '@/common/buttons'

export type ConfirmationModalProps = {
  isOpen: boolean
  description?: JSX.Element
  title: string
  children?: React.ReactNode

  error?: string
  onConfirm: () => void
  setIsOpen: (isOpen: boolean) => void
  confirmButtonDisabled?: boolean
  confirmButtonText?: string
}

export const ConfirmationModal = forwardRef(function ConfirmationModal(
  {
    children,
    isOpen = false,
    description,
    title,
    error,
    setIsOpen,
    onConfirm,
    confirmButtonDisabled = false,
    confirmButtonText = 'Confirm',
  }: ConfirmationModalProps,
  ref: ForwardedRef<HTMLDivElement>,
) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        ref={ref}
        as="div"
        className="relative z-10"
        onClose={() => setIsOpen(false)}
      >
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 text-left align-middle shadow-xl dark:shadow-xs dark:shadow-slate-900 transition-all">
                <DialogTitle
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-50"
                >
                  {title}
                </DialogTitle>

                {!!description && (
                  <Description className="text-gray-600 dark:text-gray-200 mt-4">
                    {description}
                  </Description>
                )}
                
                {children}
                {!!error && (
                  <Alert
                    type="error"
                    body={error}
                    title="Something went wrong"
                  />
                )}

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
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
})
