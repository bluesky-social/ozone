const statusColors: Record<string, string> = {
  open: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  closed: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  escalated:
    'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  assigned: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
}

export function ReportStatusBadge({ status }: { status: string }) {
  const color = statusColors[status] ?? statusColors.open
  return (
    <span
      className={`${color} inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize`}
    >
      {status}
    </span>
  )
}
