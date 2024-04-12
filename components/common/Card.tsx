import React, { ComponentProps } from 'react'

import { classNames } from '@/lib/util'

export type Variation = 'default' | 'error'
export type Hint = 'important'

export const Card = ({
  className = '',
  variation = 'default',
  hint,
  ...props
}: ComponentProps<'div'> & {
  variation?: Variation
  hint?: Hint
}) => {
  const classes = [className]
  classes.push('shadow rounded-sm p-2')
  if (variation === 'error') {
    classes.push(
      'bg-red-100 dark:bg-red-600 border-red-400 text-red-700 dark:text-red-100',
    )
  } else {
    classes.push('dark:shadow-slate-700 bg-white dark:bg-slate-800')
  }

  if (hint === 'important') {
    classes.push('border-t-2 border-red-500')
  }

  return <div className={classNames(...classes)} {...props} />
}
