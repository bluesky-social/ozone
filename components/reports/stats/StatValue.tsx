export function StatValue({
  label,
  value,
  className,
  suffix,
}: {
  label: string
  value: number | undefined
  className: string
  suffix?: string
}) {
  const displayValue =
    value === undefined || isNaN(value) || !isFinite(value)
      ? '-'
      : value?.toString()
  
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      <strong>{displayValue}</strong>
      {label}
      {suffix}
    </span>
  )
}
