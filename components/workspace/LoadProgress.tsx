import { pluralize } from '@/lib/util'
import type { WorkspaceLoadProgress } from './useWorkspaceListData'

/**
 * Progress indicator shown while workspace subject metadata is loading.
 *
 * The load fetches metadata in sequential chunks (see fetchSubjectsInChunks),
 * so for a large workspace the user would otherwise stare at bare `did:...`
 * rows with no sense of how far along the load is, or whether it's stuck.
 */
export function WorkspaceLoadProgress({
  progress,
  isFetching,
}: {
  progress: WorkspaceLoadProgress
  isFetching: boolean
}) {
  const { loaded, total } = progress

  // Nothing to show unless a load is actually in flight.
  if (!isFetching || total === 0 || loaded >= total) return null

  const percent = Math.min(100, Math.round((loaded / total) * 100))

  return (
    <div
      className="mb-2 rounded-md border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 px-3 py-2"
      role="status"
      aria-live="polite"
      data-cy="workspace-load-progress"
    >
      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1">
        <span>
          Loading account &amp; record details… {loaded} of{' '}
          {pluralize(total, 'item')}
        </span>
        <span data-cy="workspace-load-percent">{percent}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
        <div
          className="h-full bg-indigo-500 dark:bg-teal-500 transition-all duration-200"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
