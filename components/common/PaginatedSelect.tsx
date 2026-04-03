import { LoadMoreButton } from '@/common/LoadMoreButton'

export type PaginatedSelectOption = {
  value: string
  label: string
}

export function PaginatedSelect({
  value,
  onChange,
  options,
  placeholder,
  hasNextPage,
  fetchNextPage,
  className = 'block w-auto text-sm rounded border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-200',
}: {
  value: string
  onChange: (value: string) => void
  options: PaginatedSelectOption[]
  placeholder?: string
  hasNextPage?: boolean
  fetchNextPage?: () => void
  className?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hasNextPage && fetchNextPage && (
        <LoadMoreButton onClick={fetchNextPage} />
      )}
    </div>
  )
}
