'use client'
import { WrenchIcon } from '@heroicons/react/20/solid'
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import { ToolsOzoneModerationDefs } from '@atproto/api'

// Always-on batch link for the report detail page. When a report's creating
// event carries a modTool with a `batchId` in its meta, surface a link to the
// batch actions page (/events/batch/{batchId}). This is independent of the
// MOD_TOOL_REGISTRY, so it works for every tool — not just registered intake
// tools like fieldkit's TIDA form. Renders nothing when there's no batchId,
// so ordinary reports are unaffected.
//
// Mirrors the link convention in components/mod-event/ModToolInfo.tsx (tool
// name chip + external-link icon, opens in a new tab) so the report page stays
// consistent with the event timeline and scheduled actions table.
export function ReportBatchLink({
  modTool,
}: {
  modTool?: ToolsOzoneModerationDefs.ModTool
}) {
  const batchId = modTool?.meta?.batchId
  if (typeof batchId !== 'string' || !batchId) return null

  return (
    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
        <WrenchIcon className="h-3 w-3" />
        <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
          {modTool.name}
        </span>
        <a
          href={`/events/batch/${encodeURIComponent(batchId)}`}
          title="View batch actions"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 text-xs text-blue-600 hover:underline dark:text-blue-400"
        >
          View batch actions
          <ArrowTopRightOnSquareIcon className="h-3 w-3" />
        </a>
      </div>
    </div>
  )
}
