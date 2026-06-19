'use client'
import { useState } from 'react'
import {
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/20/solid'
import { ToolsOzoneModerationDefs } from '@atproto/api'
import { MOD_TOOL_REGISTRY } from '@/lib/constants'
import {
  ModToolFieldConfig,
  badgeColorClass,
  buildAdminUrl,
  getModToolConfig,
  resolvePath,
} from './modToolRegistry'

// Render a meta value in a moderator-friendly way. Booleans become Yes/No,
// arrays are listed one per line, objects fall back to compact JSON.
function renderValue(value: unknown) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-col gap-0.5">
        {value.map((item, i) => (
          <span key={i} className="break-words">
            {typeof item === 'object' ? JSON.stringify(item) : String(item)}
          </span>
        ))}
      </div>
    )
  }
  if (value && typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function isEmpty(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  )
}

// Resolve the curated rows to show. With a `fields` config, surface those
// dot-paths in order, skipping empties. Without one, fall back to showing every
// top-level meta entry so nothing is hidden for unconfigured tools.
function resolveRows(
  meta: Record<string, unknown>,
  fields?: ModToolFieldConfig[],
): { label: string; value: unknown }[] {
  if (fields?.length) {
    return fields
      .map((f) => ({ label: f.label, value: resolvePath(meta, f.path) }))
      .filter((row) => !isEmpty(row.value))
  }
  return Object.entries(meta)
    .filter(([, value]) => !isEmpty(value))
    .map(([label, value]) => ({ label, value }))
}

// Context panel shown on the report detail page for reports that originated
// from a registered external intake tool (e.g. fieldkit's TIDA/NCII form).
// Renders nothing when there's no modTool or no matching registry entry, so
// ordinary reports are unaffected.
export function ModToolContextPanel({
  modTool,
}: {
  modTool?: ToolsOzoneModerationDefs.ModTool
}) {
  const [showRaw, setShowRaw] = useState(false)

  const config = getModToolConfig(MOD_TOOL_REGISTRY, modTool?.name)
  if (!modTool || !config) return null

  const meta = (modTool.meta ?? {}) as Record<string, unknown>
  const rows = resolveRows(meta, config.fields)
  const adminUrl = buildAdminUrl(config.adminUrlTemplate, meta)
  const hasMeta = Object.keys(meta).length > 0

  return (
    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
      <div className="flex flex-row flex-wrap items-center gap-2 mb-2">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Reported via
        </p>
        <span
          className={`${badgeColorClass(
            config.color,
          )} inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium`}
          title={modTool.name}
        >
          {config.label}
        </span>
        {adminUrl && (
          <a
            href={adminUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 text-xs text-blue-600 hover:underline dark:text-blue-400"
          >
            View submission
            <ArrowTopRightOnSquareIcon className="h-3 w-3" />
          </a>
        )}
      </div>

      {rows.length > 0 && (
        <dl className="divide-y divide-gray-200 dark:divide-gray-700 rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          {rows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-3 gap-2 px-2 py-1.5 odd:bg-gray-50 dark:odd:bg-slate-800/50"
            >
              <dt className="col-span-1 text-xs font-medium text-gray-500 dark:text-gray-400 break-words">
                {row.label}
              </dt>
              <dd className="col-span-2 text-sm text-gray-700 dark:text-gray-200 break-words">
                {renderValue(row.value)}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {/* When fields are curated, offer the full payload behind a toggle so
          moderators can still inspect everything. */}
      {hasMeta && !!config.fields?.length && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            {showRaw ? (
              <ChevronDownIcon className="h-3 w-3" />
            ) : (
              <ChevronRightIcon className="h-3 w-3" />
            )}
            <span>Raw metadata</span>
          </button>
          {showRaw && (
            <div className="mt-1 rounded bg-gray-50 dark:bg-slate-800 px-2 py-2 font-mono whitespace-pre overflow-x-auto text-xs dark:text-gray-300">
              <pre>{JSON.stringify(meta, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
