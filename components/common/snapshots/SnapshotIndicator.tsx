import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { format } from 'date-fns'
import { RecordSnapshot } from '@/lib/useRecordSnapshots'

export function SnapshotIndicator({
  snapshots,
  total,
  error,
  isLoading,
  onSelectSnapshot,
}: {
  snapshots: RecordSnapshot[] | undefined
  total: number | undefined
  error: boolean
  isLoading: boolean
  onSelectSnapshot: (snapshot: RecordSnapshot) => void
}) {
  if (isLoading || error || !snapshots || total === 0) {
    return null
  }

  const snapshotText = total === 1 ? '1 snapshot' : `${total} snapshots`

  return (
    <Popover className="relative inline-block">
      <PopoverButton className="text-xs text-blue-600 dark:text-blue-400 hover:underline focus:outline-none">
        {snapshotText}
      </PopoverButton>

      <PopoverPanel className="absolute left-0 z-50 mt-2 w-64 rounded-md bg-white dark:bg-slate-700 shadow-lg ring-1 ring-black ring-opacity-5">
        {({ close }) => (
          <div className="p-2">
            <div className="mb-2 px-2 py-1 text-xs font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-slate-600">
              Available Snapshots
            </div>
            <div className="max-h-64 overflow-y-auto">
              {snapshots.map((snapshot) => (
                <button
                  type="button"
                  key={snapshot.id}
                  onClick={() => {
                    onSelectSnapshot(snapshot)
                    close()
                  }}
                  className="w-full text-left px-2 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-600 rounded transition-colors"
                >
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {format(new Date(snapshot.createdAt), 'MMM d, yyyy')}
                    <span>{format(new Date(snapshot.createdAt), 'h:mm a')}</span>
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
                    CID: {snapshot.cid}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </PopoverPanel>
    </Popover>
  )
}
