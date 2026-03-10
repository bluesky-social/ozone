import { Fragment, useEffect, useState } from 'react'
import {
  Dialog,
  Transition,
  TransitionChild,
  DialogTitle,
  Description,
  DialogPanel,
} from '@headlessui/react'
import { ActionButton } from '@/common/buttons'
import { useLatestReport, useRouteReports } from '../useQueues'

const MAX_RANGE = 5000

export function QueueManagerDialog({ onClose }: { onClose: () => void }) {
  const { data: latestReport } = useLatestReport()
  const routeReports = useRouteReports()

  // form
  const [startReportId, setStartReportId] = useState<string>('')
  const [endReportId, setEndReportId] = useState<string>('')
  useEffect(() => {
    // autofill last report ID
    if (latestReport) {
      const end = latestReport.id
      const start = Math.max(1, end - MAX_RANGE + 1)
      setEndReportId(String(end))
      setStartReportId(String(start))
    }
  }, [latestReport])
  const rangeExceeded = Number(endReportId) - Number(startReportId) >= MAX_RANGE
  const isDisabled =
    routeReports.isLoading ||
    !startReportId ||
    !endReportId ||
    Number(startReportId) > Number(endReportId) ||
    rangeExceeded

  const handleRouteReports = () => {
    const start = Number(startReportId)
    const end = Number(endReportId)
    if (!start || !end || start > end || end - start >= MAX_RANGE) return
    routeReports.mutate(
      { startReportId: start, endReportId: end },
      { onSuccess: onClose },
    )
  }

  return (
    <Transition appear show={true} as={Fragment}>
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
              <DialogPanel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 text-left align-middle shadow-xl transition-all">
                <DialogTitle
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-50"
                >
                  Queue Manager
                </DialogTitle>
                <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                  Re-route unassigned reports in the specified range. Up to{' '}
                  {MAX_RANGE.toLocaleString()} reports can be routed at a time.
                </p>

                {/* form */}
                <div className="mt-3 flex items-end gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Start Report ID
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={startReportId}
                      onChange={(e) => setStartReportId(e.target.value)}
                      className="w-32 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      End Report ID
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={endReportId}
                      onChange={(e) => setEndReportId(e.target.value)}
                      className="w-32 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                    />
                  </div>
                  <ActionButton
                    size="sm"
                    appearance="primary"
                    onClick={handleRouteReports}
                    disabled={isDisabled}
                  >
                    {routeReports.isLoading ? 'Routing...' : 'Re-route'}
                  </ActionButton>
                </div>

                {rangeExceeded && (
                  <p className="text-xs text-red-500 mt-2">
                    Range must be less than {MAX_RANGE.toLocaleString()}{' '}
                    reports.
                  </p>
                )}

                <div className="mt-4 flex flex-row justify-end">
                  <ActionButton appearance="outlined" onClick={onClose}>
                    Close
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
