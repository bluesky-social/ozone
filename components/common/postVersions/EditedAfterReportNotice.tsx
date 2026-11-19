import { ExclamationTriangleIcon } from '@heroicons/react/20/solid'
import {
  getDefaultVersionCid,
  getVersionLabel,
  PostVersion,
} from '@/lib/postVersions'
import { classNames, pluralize } from '@/lib/util'

/**
 * Shown when a post was edited after someone reported an earlier version, so
 * moderators know the current text may not be what was reported. Also covers
 * posts that were reported both before and after the edit.
 */
export function EditedAfterReportNotice({
  versions,
  viewingCid,
  reportedCids,
  onSelectVersion,
  className,
}: {
  versions: PostVersion[]
  viewingCid: string | undefined
  reportedCids: Map<string, number> | undefined
  onSelectVersion: (cid: string) => void
  className?: string
}) {
  const current = versions.at(-1)
  const reportedOlderCid = getDefaultVersionCid(versions, reportedCids)
  if (!current || !reportedOlderCid || reportedOlderCid === current.cid) {
    return null
  }
  const isViewingCurrent = !viewingCid || viewingCid === current.cid
  const reportsOnCurrent = reportedCids?.get(current.cid) ?? 0

  // e.g. "2 reports on the original, 1 report on the current version"
  const breakdown = versions
    .map((version, index) => {
      const count = reportedCids?.get(version.cid) ?? 0
      if (!count) return undefined
      const name =
        version.cid === current.cid
          ? 'the current version'
          : `the ${getVersionLabel(versions, index).toLowerCase()}`
      return `${pluralize(count, 'report')} on ${name}`
    })
    .filter(Boolean)
    .join(', ')

  return (
    <div
      className={classNames(
        'flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-900 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200',
        className,
      )}
    >
      <ExclamationTriangleIcon
        className="mt-0.5 h-4 w-4 flex-shrink-0"
        aria-hidden="true"
      />
      <p className="flex-1">
        <span className="font-semibold">
          {reportsOnCurrent > 0
            ? 'Reported before and after it was edited.'
            : 'Edited after it was reported.'}
        </span>{' '}
        {reportsOnCurrent > 0 ? `${breakdown}. ` : ''}
        {isViewingCurrent
          ? reportsOnCurrent > 0
            ? 'You are viewing the current version.'
            : 'You are viewing the current version, not the one that was reported.'
          : 'You are viewing the version that was reported before the edit.'}
      </p>
      <button
        type="button"
        className="flex-shrink-0 font-medium underline hover:no-underline"
        onClick={() =>
          onSelectVersion(isViewingCurrent ? reportedOlderCid : current.cid)
        }
      >
        {isViewingCurrent ? 'View earlier version' : 'View current version'}
      </button>
    </div>
  )
}
