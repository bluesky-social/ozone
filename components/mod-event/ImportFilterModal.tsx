import {
  Description,
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
} from '@headlessui/react'
import { Fragment, useState } from 'react'
import { toast } from 'react-toastify'

import { ActionButton } from '@/common/buttons'
import { Input } from '@/common/forms'
import { EventListState } from './useModEventList'

export const ImportFilterModal = ({
  isOpen,
  setIsDialogOpen,
  onSubmit,
}: {
  isOpen: boolean
  setIsDialogOpen: (isOpen: boolean) => void
  onSubmit?: (filters: Partial<EventListState>) => void
}) => {
  const [isImporting, setIsImporting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    try {
      setIsImporting(true)
      e.preventDefault()
      const formData = new FormData(e.currentTarget)
      const items = formData.get('items') as string
      const filters = JSON.parse(items) as Partial<EventListState>
      onSubmit?.(filters)
      setIsDialogOpen(false)
    } catch (err) {
      console.error('Error importing filter:', err)
      toast.error(
        'Failed to import filter. Please check the format and try again.',
      )
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog
      as="div"
      className="relative z-10"
      open={isOpen}
      onClose={() => setIsDialogOpen(false)}
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
            <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 text-left align-middle shadow-xl transition-all">
              <DialogTitle
                as="h3"
                className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-50"
              >
                Import Filters
              </DialogTitle>

              <Description className="text-gray-600 dark:text-gray-50 mt-4">
                <form
                  onSubmit={handleSubmit}
                  className="flex flex-col items-center gap-2"
                >
                  <Input
                    autoFocus
                    disabled={isImporting}
                    name="items"
                    placeholder={`Example: ${JSON.stringify(
                      { types: ['appeal'] },
                      null,
                      1,
                    )}`}
                    className={`block p-2 w-full`}
                    type="text"
                  />
                  <div>
                    <ActionButton
                      appearance="outlined"
                      className="mr-2"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </ActionButton>
                    <ActionButton
                      type="submit"
                      appearance="outlined"
                      disabled={isImporting}
                    >
                      Import
                    </ActionButton>
                  </div>
                </form>
              </Description>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  )
}
