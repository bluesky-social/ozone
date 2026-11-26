import { useState } from 'react'
import { CopyButton } from '@/common/CopyButton'
import { getVersionLabel, PostVersion } from '@/lib/postVersions'
import { classNames, pluralize } from '@/lib/util'
import { CurrentBadge, ReportedBadge } from './VersionBadges'
import { VersionContent } from './VersionContent'
import { formatEditDelay, formatVersionTime } from './util'

/**
 * Every version of an edited post, oldest first, with what changed between
 * each version and the one before it.
 */
export function PostVersionsList({
  versions,
  reportedCids,
}: {
  versions: PostVersion[]
  reportedCids: Map<string, number> | undefined
}) {
  const [showChanges, setShowChanges] = useState(true)
  const current = versions.at(-1)

  return (
    <div className="mx-auto mt-6 max-w-5xl px-4 sm:px-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-500 dark:text-gray-300">
          Oldest first. Each report is matched to the version the reporter saw.
        </p>
        <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
          <input
            type="checkbox"
            className="rounded border-gray-300 text-pink-600 focus:ring-pink-500 dark:text-teal-500 dark:focus:ring-teal-500"
            checked={showChanges}
            onChange={(e) => setShowChanges(e.target.checked)}
          />
          Highlight changes
        </label>
      </div>

      <ol className="relative border-l border-gray-200 dark:border-slate-700">
        {versions.map((version, index) => {
          const previous = index > 0 ? versions[index - 1] : undefined
          const reports = reportedCids?.get(version.cid) ?? 0
          return (
            <li key={version.cid} className="mb-8 ml-6">
              <span
                className={classNames(
                  'absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white dark:border-slate-900',
                  reports > 0 ? 'bg-red-500' : 'bg-gray-300 dark:bg-slate-500',
                )}
                aria-hidden="true"
              />
              <VersionCard
                label={getVersionLabel(versions, index)}
                version={version}
                previous={showChanges ? previous : undefined}
                isCurrent={version.cid === current?.cid}
                reports={reports}
              />
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function VersionCard({
  label,
  version,
  previous,
  isCurrent,
  reports,
}: {
  label: string
  version: PostVersion
  previous: PostVersion | undefined
  isCurrent: boolean
  reports: number
}) {
  const delay = formatEditDelay(version)

  return (
    <div
      className={classNames(
        'rounded-md border p-4 bg-white dark:bg-slate-800',
        reports > 0
          ? 'border-red-200 dark:border-red-900'
          : 'border-gray-200 dark:border-slate-700',
      )}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {label}
        </h3>
        {isCurrent && <CurrentBadge />}
        {reports > 0 && <ReportedBadge count={reports} />}
        <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
          {formatVersionTime(version)}
          {delay ? ` (${delay})` : ''}
        </span>
      </div>

      <VersionContent version={version} previous={previous} />

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
        <span>
          {[
            pluralize(version.likeCount ?? 0, 'like'),
            pluralize(version.repostCount ?? 0, 'repost'),
            pluralize(version.replyCount ?? 0, 'reply', { plural: 'replies' }),
            pluralize(version.quoteCount ?? 0, 'quote'),
          ].join(' · ')}
        </span>
        <span className="flex min-w-0 items-center gap-1">
          <CopyButton text={version.cid} label="CID" />
          <span className="truncate">CID: {version.cid}</span>
        </span>
      </div>
    </div>
  )
}
