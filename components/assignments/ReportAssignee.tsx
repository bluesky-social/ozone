import { XMarkIcon } from '@heroicons/react/24/outline'

interface ReportAssigneeProps {
  did: string
  onRemove: () => void
}

export function ReportAssignee({ did, onRemove }: ReportAssigneeProps) {
  return (
    <span className="group inline-flex items-center gap-1 rounded bg-gray-100 dark:bg-slate-700 px-2 py-0.5 text-xs text-gray-700 dark:text-gray-200">
      {did.slice(0, 20)}...
      <button
        onClick={onRemove}
        className="hidden group-hover:inline-flex text-gray-400 hover:text-red-500"
        title="Remove assignee"
      >
        <XMarkIcon className="h-3 w-3" />
      </button>
    </span>
  )
}
