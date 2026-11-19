import { pluralize } from '@/lib/util'

export function CurrentBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-slate-700 dark:text-gray-200">
      Current
    </span>
  )
}

export function ReportedBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-200">
      {pluralize(count, 'report')}
    </span>
  )
}

export function EditedBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-200">
      Edited
    </span>
  )
}
