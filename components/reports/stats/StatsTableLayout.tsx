import type { ReactNode } from 'react'

export function StatsTableLayout({
  headings,
  children,
  className = '',
}: {
  headings: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full text-sm ${className}`}>
        <thead className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
          <tr>{headings}</tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
          {children}
        </tbody>
      </table>
    </div>
  )
}
