import { ButtonHTMLAttributes } from 'react'

export function LoadMoreButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = '', children, ...others } = props
  return (
    <button
      type="button"
      className={`inline-flex items-center rounded border border-gray-300 dark:border-slate-400 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-100 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-teal-500 focus:ring-offset-2 ${className}`}
      {...others}
    >
      {children ?? 'Load more'}
    </button>
  )
}
