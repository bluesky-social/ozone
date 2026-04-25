'use client'
import { Fragment, useEffect, useState } from 'react'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react'
import { CheckIcon } from '@heroicons/react/20/solid'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { ActionButton } from '@/common/buttons'
import { Textarea } from '@/common/forms'
import { Loading } from '@/common/Loader'
import { classNames } from '@/lib/util'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useQueueList } from 'components/queues/useQueues'

type Props = {
  isOpen: boolean
  onClose: () => void
  reportId: number
  currentQueueId?: number
}

export function ReassignQueueModal({
  isOpen,
  onClose,
  reportId,
  currentQueueId,
}: Props) {
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()
  const { data, isLoading } = useQueueList()
  const queues = data?.pages.flatMap((p) => p.queues) ?? []

  const [selectedQueueId, setSelectedQueueId] = useState<number | undefined>(
    currentQueueId,
  )
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setSelectedQueueId(currentQueueId)
      setComment('')
      setSubmitting(false)
    }
  }, [isOpen, currentQueueId])

  const showSubmit =
    selectedQueueId !== undefined && selectedQueueId !== currentQueueId

  const handleClose = () => {
    if (!submitting) onClose()
  }

  const handleSubmit = async () => {
    if (selectedQueueId === undefined) return
    setSubmitting(true)
    try {
      await labelerAgent.tools.ozone.report.reassignQueue({
        reportId,
        queueId: selectedQueueId,
        ...(comment ? { comment } : {}),
      })
      toast.success('Report re-routed')
      queryClient.invalidateQueries({ queryKey: ['report', reportId] })
      queryClient.invalidateQueries({
        queryKey: ['reportActivities', reportId],
      })
      onClose()
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to reroute report')
      setSubmitting(false)
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-40" onClose={handleClose}>
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
                  Route report to another queue
                </DialogTitle>

                <div className="mt-4 max-h-72 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700">
                  {isLoading ? (
                    <div className="flex justify-center py-6">
                      <Loading />
                    </div>
                  ) : queues.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                      No queues available.
                    </p>
                  ) : (
                    <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                      {queues.map((q) => {
                        const isSelected = q.id === selectedQueueId
                        const isCurrent = q.id === currentQueueId
                        return (
                          <li key={q.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedQueueId(q.id)}
                              className={classNames(
                                'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm',
                                isSelected
                                  ? 'bg-indigo-50 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-100'
                                  : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-slate-700',
                              )}
                            >
                              <span className="flex items-center gap-2">
                                {isSelected ? (
                                  <CheckIcon className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-300" />
                                ) : (
                                  <span className="h-4 w-4 shrink-0" />
                                )}
                                <span className="truncate">{q.name}</span>
                              </span>
                              {isCurrent && (
                                <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                                  Current
                                </span>
                              )}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>

                {showSubmit && (
                  <div className="mt-4">
                    <Textarea
                      placeholder="Comment (optional)"
                      className="block w-full"
                      rows={3}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </div>
                )}

                <div className="mt-4 flex flex-row justify-end">
                  <ActionButton
                    appearance="outlined"
                    className="mr-2"
                    disabled={submitting}
                    onClick={handleClose}
                  >
                    Cancel
                  </ActionButton>
                  {showSubmit && (
                    <ActionButton
                      appearance="primary"
                      disabled={submitting}
                      onClick={handleSubmit}
                    >
                      {submitting ? 'Routing…' : 'Route'}
                    </ActionButton>
                  )}
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
