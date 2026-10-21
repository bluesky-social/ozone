import { ClockIcon } from '@heroicons/react/24/outline'
import { ToolsOzoneModerationDefs } from '@atproto/api'

import { useVideoTimestamp } from '@/common/video/TimestampContext'
import { MOD_TOOL_REGISTRY } from '@/lib/constants'
import {
  getModToolConfig,
  resolveVideoTimestampSeconds,
} from './modToolRegistry'

export function getVideoTimestampSeconds(
  modTool?: ToolsOzoneModerationDefs.ModTool,
) {
  const config = getModToolConfig(MOD_TOOL_REGISTRY, modTool?.name)
  return resolveVideoTimestampSeconds(
    modTool?.meta as Record<string, unknown> | undefined,
    config,
  )
}

function formatTimestamp(seconds: number) {
  const wholeSeconds = Math.floor(seconds)
  const minutes = Math.floor(wholeSeconds / 60)
  const remainder = wholeSeconds % 60
  return `${minutes}:${remainder.toString().padStart(2, '0')}s`
}

export function ReportedVideoTimestamp({ seconds }: { seconds?: number }) {
  const videoTimestamp = useVideoTimestamp()
  if (seconds === undefined) return null

  return (
    <button
      type="button"
      className="mt-2 inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:hover:bg-blue-900"
      onClick={() => videoTimestamp?.seekTo(seconds)}
      title="Seek reported video to this timestamp"
    >
      <ClockIcon className="h-3.5 w-3.5" />
      Reported timestamp {formatTimestamp(seconds)}
    </button>
  )
}
