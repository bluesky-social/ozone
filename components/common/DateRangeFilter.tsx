import { differenceInDays, subDays } from 'date-fns'

export type DateRangePreset = '7d' | '30d' | '90d' | 'custom'

export type DateRangeValue = {
  startDate?: string
  endDate?: string
  preset: DateRangePreset
}

const PRESETS: { key: DateRangePreset; label: string; days: number }[] = [
  { key: '7d', label: '7 days', days: 7 },
  { key: '30d', label: '30 days', days: 30 },
  { key: '90d', label: '90 days', days: 90 },
]

export function computeDatesForPreset(preset: DateRangePreset): {
  startDate?: string
  endDate?: string
} {
  const presetConfig = PRESETS.find((p) => p.key === preset)
  if (!presetConfig) return {}
  return {
    startDate: subDays(new Date(), presetConfig.days).toISOString(),
    endDate: new Date().toISOString(),
  }
}

export function DateRangeFilter({
  value,
  onChange,
  limit,
}: {
  value: DateRangeValue
  onChange: (value: DateRangeValue) => void
  limit?: number
}) {
  const exceedsMax =
    limit !== undefined
      ? value.startDate && value.endDate
        ? differenceInDays(new Date(value.endDate), new Date(value.startDate)) >
          limit
        : false
      : false

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 min-h-[38px]">
        {PRESETS.map((preset) => (
          <button
            key={preset.key}
            onClick={() =>
              onChange({
                ...computeDatesForPreset(preset.key),
                preset: preset.key,
              })
            }
            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
              value.preset === preset.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
            }`}
          >
            {preset.label}
          </button>
        ))}
        <button
          onClick={() => onChange({ ...value, preset: 'custom' })}
          className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
            value.preset === 'custom'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
          }`}
        >
          Custom
        </button>
        {value.preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="block w-auto text-xs rounded border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-200 dark:[color-scheme:dark]"
              value={value.startDate ? value.startDate.split('T')[0] : ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  startDate: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : undefined,
                })
              }
            />
            <span className="text-xs text-gray-500">to</span>
            <input
              type="date"
              className="block w-auto text-xs rounded border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-200 dark:[color-scheme:dark]"
              value={value.endDate ? value.endDate.split('T')[0] : ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  endDate: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : undefined,
                })
              }
            />
          </div>
        )}
      </div>
      {exceedsMax && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
          Date range cannot exceed {limit} days
        </p>
      )}
    </div>
  )
}
