import { ComponentProps } from 'react'

export function LabelList(props: ComponentProps<'div'>) {
  const { className = '', ...others } = props
  return (
    <div
      className={`items-center gap-x-1 text-sm leading-6 text-gray-900 ${className}`}
      {...others}
    />
  )
}

export function LabelListEmpty(props: ComponentProps<'div'>) {
  const { className = '', children, ...others } = props
  return (
    <div className={`text-sm text-gray-400 ${className}`} {...others}>
      None {children}
    </div>
  )
}

export function LabelChip(props: ComponentProps<'span'>) {
  const { className = '', ...others } = props
  return (
    <span
      className={`inline-flex mx-1 items-center rounded-md px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 font-semibold ${className}`}
      {...others}
    />
  )
}
