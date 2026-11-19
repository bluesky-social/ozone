import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { CheckIcon, PencilIcon } from '@heroicons/react/20/solid'
import { getVersionLabel, PostVersion } from '@/lib/postVersions'
import { CurrentBadge, ReportedBadge } from './VersionBadges'
import { formatEditDelay, formatVersionTime } from './util'

/**
 * "Edited - 2 versions" control that lets moderators switch which version of
 * a post they are looking at. Sits next to the snapshots control.
 */
export function PostVersionsIndicator({
  versions,
  viewingCid,
  reportedCids,
  onSelectVersion,
}: {
  versions: PostVersion[]
  viewingCid: string | undefined
  reportedCids: Map<string, number> | undefined
  onSelectVersion: (cid: string) => void
}) {
  const current = versions.at(-1)
  return (
    <Popover className="relative inline-block">
      <PopoverButton className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline focus:outline-none">
        <PencilIcon className="h-3 w-3" aria-hidden="true" />
        Edited &middot; {versions.length} versions
      </PopoverButton>

      <PopoverPanel className="absolute left-0 z-50 mt-2 w-80 rounded-md bg-white dark:bg-slate-700 shadow-lg ring-1 ring-black ring-opacity-5">
        {({ close }) => (
          <div className="p-2">
            <div className="mb-2 px-2 py-1 text-xs font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-slate-600">
              Post versions
            </div>
            <ul className="max-h-72 overflow-y-auto">
              {versions.map((version, index) => {
                const reports = reportedCids?.get(version.cid) ?? 0
                const isViewing = (viewingCid ?? current?.cid) === version.cid
                const delay = formatEditDelay(version)
                return (
                  <li key={version.cid}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectVersion(version.cid)
                        close()
                      }}
                      className="flex w-full items-start gap-2 rounded px-2 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-600"
                    >
                      <span className="mt-0.5 w-4 flex-shrink-0">
                        {isViewing && (
                          <CheckIcon className="h-4 w-4" aria-hidden="true" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium">
                            {getVersionLabel(versions, index)}
                          </span>
                          {version.cid === current?.cid && <CurrentBadge />}
                          {reports > 0 && <ReportedBadge count={reports} />}
                        </span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">
                          {formatVersionTime(version)}
                          {delay ? ` (${delay})` : ''}
                        </span>
                        <span className="block truncate text-xs text-gray-400 dark:text-gray-500">
                          CID: {version.cid}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </PopoverPanel>
    </Popover>
  )
}
