// Registry that lets Ozone show richer, tool-specific context for reports that
// originate from external intake tools (e.g. fieldkit's TIDA/NCII intake form).
//
// A report created by an external tool carries a `modTool` on its
// report-creating moderation event: `{ name, meta }`. This registry maps a
// `modTool.name` to display config so the report detail page can render a
// human-friendly panel (label, curated field table, deep link back to the
// originating tool) instead of a raw JSON blob.
//
// The registry is configured entirely via the NEXT_PUBLIC_MOD_TOOL_REGISTRY
// env var (parsed in lib/constants.ts), mirroring NEXT_PUBLIC_QUEUE_CONFIG.
// Onboarding a new intake tool is a config change, not a code change.

// A single curated field to surface from `modTool.meta`. `path` is a dot-path
// resolved against the meta object (e.g. "fields.contact.submitterRole").
export type ModToolFieldConfig = {
  path: string
  label: string
}

export type ModToolConfig = {
  // Human-friendly name shown on the badge, e.g. "fieldkit · TIDA intake".
  label: string
  // One of the supported badge colors below. Defaults to "gray" if omitted or
  // unknown. Kept as a fixed enum so Tailwind can statically see the classes.
  color?: ModToolBadgeColor
  // Optional deep link back to the originating tool. Supports {placeholder}
  // substitution from top-level meta keys, e.g.
  // "https://fieldkit.example.com/admin/submissions/{submissionId}".
  adminUrlTemplate?: string
  // Optional ordered list of curated fields to surface. When present, only
  // these (non-empty) fields are shown as a table and the full meta is offered
  // behind a "raw" toggle. When absent, all meta entries are auto-rendered.
  fields?: ModToolFieldConfig[]
}

export type ModToolRegistry = Record<string, ModToolConfig>

export type ModToolBadgeColor =
  | 'gray'
  | 'rose'
  | 'blue'
  | 'green'
  | 'amber'
  | 'purple'
  | 'teal'

// Static class strings per color so Tailwind's JIT can see them. Do not build
// these dynamically (e.g. `bg-${color}-100`) or they'll be purged in prod.
export const MOD_TOOL_BADGE_COLORS: Record<ModToolBadgeColor, string> = {
  gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  rose: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  teal: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
}

export function badgeColorClass(color?: string): string {
  return (
    MOD_TOOL_BADGE_COLORS[color as ModToolBadgeColor] ??
    MOD_TOOL_BADGE_COLORS.gray
  )
}

// Parse the raw env JSON into a registry. Never throws: malformed config logs a
// warning and yields an empty registry so the report page is unaffected.
export function parseModToolRegistry(raw?: string): ModToolRegistry {
  if (!raw || !raw.trim()) return {}
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      console.warn(
        'NEXT_PUBLIC_MOD_TOOL_REGISTRY must be a JSON object keyed by modTool name',
      )
      return {}
    }
    return parsed as ModToolRegistry
  } catch (err) {
    console.warn('Failed to parse NEXT_PUBLIC_MOD_TOOL_REGISTRY:', err)
    return {}
  }
}

export function getModToolConfig(
  registry: ModToolRegistry,
  name?: string,
): ModToolConfig | undefined {
  if (!name) return undefined
  return registry[name]
}

// Resolve a dot-path against an object, e.g. resolvePath(meta, "fields.a.b").
// Returns undefined if any segment is missing or a non-object is traversed.
export function resolvePath(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

// Build an admin deep link from a template + meta. Returns undefined unless a
// template is provided and every {placeholder} resolves to a non-empty value,
// so we never render a half-substituted (broken) link.
export function buildAdminUrl(
  template: string | undefined,
  meta: Record<string, unknown> | undefined,
): string | undefined {
  if (!template) return undefined
  const placeholders = template.match(/\{([^}]+)\}/g)
  if (!placeholders) return template
  let ok = true
  const url = template.replace(/\{([^}]+)\}/g, (_, key: string) => {
    const value = resolvePath(meta, key)
    if (value === undefined || value === null || value === '') {
      ok = false
      return ''
    }
    return encodeURIComponent(String(value))
  })
  return ok ? url : undefined
}
