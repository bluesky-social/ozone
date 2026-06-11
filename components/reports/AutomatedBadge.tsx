import { ToolsOzoneModerationDefs } from '@atproto/api'
import { CpuChipIcon } from '@heroicons/react/20/solid'

const getRules = (
  meta: ToolsOzoneModerationDefs.ModTool['meta'],
): string[] | undefined => {
  const rules = meta?.rules
  if (Array.isArray(rules) && rules.length > 0) {
    return rules.map((rule) => String(rule))
  }
  return undefined
}

// Rendered when a report was created by an automated tool (e.g. an Osprey
// rule via osprey-effector) rather than a human reporter, based on the
// `modTool` info from the originating moderation event.
export function AutomatedBadge({
  modTool,
}: {
  modTool?: ToolsOzoneModerationDefs.ModTool
}) {
  if (!modTool?.name) return null

  const rules = getRules(modTool.meta)
  const title = rules
    ? `Created by ${modTool.name}\nRules: ${rules.join(', ')}`
    : `Created by ${modTool.name}`

  return (
    <span
      title={title}
      data-cy="automated-badge"
      className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
    >
      <CpuChipIcon className="h-3 w-3" />
      Automated
    </span>
  )
}
