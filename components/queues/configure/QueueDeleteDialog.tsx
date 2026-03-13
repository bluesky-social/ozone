import { Fragment, useState } from 'react'
import {
  Dialog,
  Transition,
  TransitionChild,
  DialogTitle,
  Description,
  DialogPanel,
} from '@headlessui/react'
import { ToolsOzoneQueueDefs } from '@atproto/api'
import { ActionButton } from '@/common/buttons'
import { Select, FormLabel } from '@/common/forms'
import { useDeleteQueue } from '../useQueues'

export function QueueDeleteDialog({
  queue,
  queues,
  onClose,
}: {
  queue?: ToolsOzoneQueueDefs.QueueView
  queues: ToolsOzoneQueueDefs.QueueView[]
  onClose: () => void
}) {
  const [migrateToQueueId, setMigrateToQueueId] = useState<string>('')
  const deleteMutation = useDeleteQueue()

  const otherQueues = queues.filter((q) => q.id !== queue?.id)
  const selectedTarget = otherQueues.find(
    (q) => q.id === Number(migrateToQueueId),
  )
  const isLastQueue = queues.length <= 1

  const handleDelete = async () => {
    if (!queue) return
    await deleteMutation.mutateAsync(
      {
        queueId: queue.id,
        ...(migrateToQueueId
          ? { migrateToQueueId: Number(migrateToQueueId) }
          : {}),
      },
      {
        onSuccess: () => {
          setMigrateToQueueId('')
          onClose()
        },
      },
    )
  }

  return (
    <Transition appear show={!!queue} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
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
              <DialogPanel
                data-cy="delete-queue-dialog"
                className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 text-left align-middle shadow-xl transition-all"
              >
                <DialogTitle
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-50"
                >
                  Delete Queue: {queue?.name}?
                </DialogTitle>

                <Description className="text-gray-600 dark:text-gray-200 mt-4">
                  This will permanently delete the queue. Pending reports
                  assigned to this queue can be migrated to another queue or
                  left unassigned.
                </Description>

                {isLastQueue && (
                  <p className="mt-3 text-sm text-yellow-600 dark:text-yellow-400">
                    Warning: This is the last queue. Deleting it will leave all
                    incoming reports unrouted.
                  </p>
                )}

                {otherQueues.length > 0 && (
                  <FormLabel
                    label="Migrate reports to"
                    htmlFor="migrate-target"
                    className="mt-4"
                  >
                    <Select
                      id="migrate-target"
                      className="w-full"
                      value={migrateToQueueId}
                      onChange={(e) => setMigrateToQueueId(e.target.value)}
                    >
                      <option value="">
                        No migration (reports become unassigned)
                      </option>
                      {otherQueues.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.name}
                        </option>
                      ))}
                    </Select>
                    {selectedTarget && !selectedTarget.enabled && (
                      <p className="text-yellow-600 dark:text-yellow-400 text-xs mt-1">
                        Warning: Target queue is currently disabled
                      </p>
                    )}
                  </FormLabel>
                )}

                <div className="mt-4 flex flex-row justify-end">
                  <ActionButton
                    appearance="outlined"
                    className="mr-2"
                    onClick={onClose}
                  >
                    Cancel
                  </ActionButton>
                  <ActionButton
                    appearance="negative"
                    onClick={handleDelete}
                    disabled={deleteMutation.isLoading}
                    data-cy="confirm-delete-queue-button"
                  >
                    {deleteMutation.isLoading ? 'Deleting...' : 'Delete Queue'}
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
