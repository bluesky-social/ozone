'use client'
import { useState } from 'react'
import {
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline'
import {
  ToolsOzoneReportDefs,
  ToolsOzoneTeamDefs,
} from '@atproto/api'
import { pluralize } from '@/lib/util'
import { MemberView } from 'components/reports/MemberView'

export type AssignmentViewWithModerator = ToolsOzoneReportDefs.AssignmentView & {
  moderator?: ToolsOzoneTeamDefs.Member
}

export function ViewersIndicator({
  viewers,
  onClickDid,
}: {
  viewers: AssignmentViewWithModerator[]
  onClickDid?: (did: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  if (viewers.length === 0) return null

  return (
    <div className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 px-4 py-2">
      <button
        className="flex w-full flex-row items-center justify-between text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
        onClick={() => setExpanded((v) => !v)}
      >
        <span>
          {pluralize(viewers.length, 'moderator')} viewing
        </span>
        {expanded ? (
          <ChevronUpIcon className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronDownIcon className="h-4 w-4 shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="mt-3 flex flex-col gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          {viewers.map((v) =>
            v.moderator ? (
              <MemberView
                key={v.did}
                member={v.moderator}
                assignedAt={v.startAt}
                sinceLabel="Viewing since"
                onClickDid={onClickDid}
              />
            ) : (
              <div
                key={v.did}
                className="text-sm text-gray-500 dark:text-gray-400"
              >
                {onClickDid ? (
                  <button
                    type="button"
                    className="hover:underline hover:text-blue-600 dark:hover:text-blue-400"
                    onClick={() => onClickDid(v.did)}
                  >
                    {v.did}
                  </button>
                ) : (
                  v.did
                )}
              </div>
            ),
          )}
        </div>
      )}
    </div>
  )
}
