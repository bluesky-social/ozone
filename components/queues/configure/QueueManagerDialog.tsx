import { ActionButton } from '@/common/buttons'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react'
import { Fragment, useEffect, useRef, useState } from 'react'
import { useLatestReport, useRouteReports } from '../useQueues'

const MAX_RANGE = 5000

type LogEntry = {
  timestamp: Date
  message: string
  state?: 'info' | 'error'
}

export function QueueManagerDialog({ onClose }: { onClose: () => void }) {
  const { data: latestReport } = useLatestReport()
  const routeReports = useRouteReports()

  // form state
  const [startReportId, setStartReportId] = useState<number | undefined>()
  const [endReportId, setEndReportId] = useState<number | undefined>()
  const rangeExceeded = (endReportId ?? 0) - (startReportId ?? 0) > MAX_RANGE
  const isDisabled =
    routeReports.isLoading ||
    startReportId === undefined ||
    endReportId === undefined ||
    (startReportId !== undefined &&
      endReportId !== undefined &&
      startReportId > endReportId) ||
    rangeExceeded

  // logging
  const [log, setLog] = useState<LogEntry[]>([])
  const logEndRef = useRef<HTMLDivElement>(null)
  const appendLog = (entry: LogEntry) => {
    setLog((prev) => [...prev, entry])
    setTimeout(() => {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 0)
  }

  // autofill
  const [highlighted, setHighlighted] = useState(false)
  const flashFields = () => {
    setHighlighted(true)
    setTimeout(() => setHighlighted(false), 600)
  }
  const resetRange = () => {
    if (!latestReport) return
    const end = latestReport.id
    const start = Math.max(1, end - MAX_RANGE + 1)
    setEndReportId(end)
    setStartReportId(start)
    flashFields()
  }
  const shiftRange = () => {
    if (!startReportId || !endReportId) return
    const blockSize = MAX_RANGE
    const newEnd = startReportId - 1
    const newStart = Math.max(1, newEnd - blockSize + 1)
    setEndReportId(newEnd)
    setStartReportId(newStart)
    flashFields()
  }
  useEffect(() => {
    // autofill last report ID
    if (endReportId === undefined) {
      resetRange()
    }
  }, [latestReport, endReportId])

  // submission
  const handleRouteReports = () => {
    const start = Number(startReportId)
    const end = Number(endReportId)
    if (!start || !end || start > end || end - start >= MAX_RANGE) return
    appendLog({
      timestamp: new Date(),
      message: `Routing reports ${start} - ${end}...`,
      state: 'info',
    })
    routeReports.mutate(
      { startReportId: start, endReportId: end },
      {
        onSuccess: () => {
          appendLog({
            timestamp: new Date(),
            message: `Successfully routed reports ${start} - ${end}`,
          })
          if (start > 1) shiftRange()
        },
        onError: (error) => {
          appendLog({
            timestamp: new Date(),
            message: `Failed to route reports ${start} - ${end}`,
            state: 'error',
          })
        },
      },
    )
  }

  return (
    <Transition appear show={true} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-10"
        onClose={() => {
          // Disable dismissing via outside clicks
        }}
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
              <DialogPanel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 text-left align-middle shadow-xl transition-all">
                <DialogTitle
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-50"
                >
                  Queue Manager
                </DialogTitle>
                <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                  Route unassigned reports between a starting and ending ID. The
                  most recent block of reports is selected first. The previous
                  block will be autofilled after a block is routed. Up to{' '}
                  {MAX_RANGE.toLocaleString()} reports can be routed at a time.
                </p>

                {/* form */}
                <div className="mt-3 flex items-end gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Start ID
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={startReportId}
                      onChange={(e) => setStartReportId(Number(e.target.value))}
                      className={`w-32 px-2 py-1 text-sm border rounded transition-colors duration-500 ${highlighted ? 'bg-slate-200 dark:bg-slate-600' : 'dark:bg-gray-700'} dark:border-gray-600 dark:text-gray-200`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      End ID
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={endReportId}
                      onChange={(e) => setEndReportId(Number(e.target.value))}
                      className={`w-32 px-2 py-1 text-sm border rounded transition-colors duration-500 ${highlighted ? 'bg-slate-200 dark:bg-slate-600' : 'dark:bg-gray-700'} dark:border-gray-600 dark:text-gray-200`}
                    />
                  </div>
                  <ActionButton
                    size="sm"
                    appearance="primary"
                    onClick={handleRouteReports}
                    disabled={isDisabled}
                    className="w-32 text-center"
                  >
                    <p className="w-full text-center">
                      {routeReports.isLoading ? 'Routing...' : 'Route'}
                    </p>
                  </ActionButton>
                </div>

                {rangeExceeded && (
                  <p className="text-xs text-red-500 mt-2">
                    Up to {MAX_RANGE.toLocaleString()} reports can be routed at
                    a time.
                  </p>
                )}

                {/* log */}
                <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="h-64 overflow-y-auto">
                    {log.map((entry, i) => (
                      <div
                        key={i}
                        className={`px-3 py-1.5 text-xs border-t border-gray-100 dark:border-gray-700 first:border-t-0 font-mono ${
                          entry.state === 'error'
                            ? 'text-red-500'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="text-gray-400 dark:text-gray-500">
                          {entry.timestamp.toLocaleTimeString()}
                        </span>{' '}
                        {entry.message}
                      </div>
                    ))}
                    <div ref={logEndRef} />
                  </div>
                </div>
                <button
                  className="mt-2 text-xs text-gray-500 dark:text-gray-400 hover:underline"
                  onClick={() => setLog([])}
                >
                  Clear log
                </button>

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
