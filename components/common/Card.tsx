import React from 'react'

export type Variation = 'default' | 'error'

export const Card = ({
  children,
  variation = 'default',
}: {
  children: React.ReactNode
  variation?: Variation
}) => {
  let className = 'shadow rounded-sm p-2'
  if (variation === 'error') {
    className += ' bg-red-100 dark:bg-red-600 border-red-400 text-red-700 dark:text-red-100'
  } else {
    className += ' dark:shadow-slate-700 bg-white dark:bg-slate-800'
  }
  return <div className={className}>{children}</div>
}
