import { REPORT_CATEGORIES } from './stats'

export function ReportCategorySelect({
  value,
  onChange,
}: {
  value: string | undefined
  onChange: (value: string | undefined) => void
}) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || undefined)}
      className="block w-auto text-sm rounded border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-200"
    >
      <option value="">All Categories</option>
      {REPORT_CATEGORIES.map((cat) => (
        <option key={cat.key} value={cat.key}>
          {cat.title}
        </option>
      ))}
    </select>
  )
}

/** Resolve a category key to its constituent report types */
export function categoryToReportTypes(
  categoryKey: string | undefined,
): string[] {
  if (!categoryKey) return []
  const cat = REPORT_CATEGORIES.find((c) => c.key === categoryKey)
  return cat?.reportTypes ?? []
}
