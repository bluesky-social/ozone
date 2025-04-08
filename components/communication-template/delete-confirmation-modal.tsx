import {
  Dialog,
  Transition,
  TransitionChild,
  DialogTitle,
  Description,
  DialogPanel,
} from '@headlessui/react'
import { useQueryClient } from '@tanstack/react-query'
import { Fragment, useState } from 'react'
import { toast } from 'react-toastify'

import { ActionButton } from '@/common/buttons'
import { useLabelerAgent } from '@/shell/ConfigurationContext'

export const CommunicationTemplateDeleteConfirmationModal = ({
  setIsDialogOpen,
  templateId,
}: {
  setIsDialogOpen: (isOpen: boolean) => void
  templateId?: string
}) => {
  const [isDeleting, setIsDeleting] = useState(false)
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()

  if (!templateId) {
    return null
  }

  const onDelete = async () => {
    setIsDeleting(true)
    try {
      await labelerAgent.api.tools.ozone.communication.deleteTemplate({
        id: templateId,
      })
      toast.success('Template deleted')
      queryClient.invalidateQueries(['communicationTemplateList'])
      setIsDeleting(false)
      setIsDialogOpen(false)
    } catch (err: any) {
      setIsDeleting(false)
      toast.error(`Failed to delete template: ${err.message}`)
      console.error(err)
    }
  }

  return (
    <Transition appear show={!!templateId} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-10"
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
                  Delete this template?
                </DialogTitle>

                <Description className="text-gray-600 dark:text-gray-50 mt-4">
                  You will no longer be able to use this template to send emails
                  to users.
                </Description>
                <Description className="text-gray-600 dark:text-gray-50">
                  Remember, this will not affect already sent emails that used
                  this template.
                </Description>

                <div className="mt-4 flex flex-row justify-end">
                  <ActionButton
                    appearance="outlined"
                    className="mr-2"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </ActionButton>
                  <ActionButton
                    appearance="primary"
                    onClick={onDelete}
                    disabled={isDeleting}
                  >
                    Delete Template
                  </ActionButton>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
