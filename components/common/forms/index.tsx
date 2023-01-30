import { ComponentProps } from 'react'

export function Input(props: ComponentProps<'input'>) {
  const { className = '', ...others } = props
  return (
    <input
      className={`rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${className}`}
      {...others}
    />
  )
}

export function Select(props: ComponentProps<'select'>) {
  const { className = '', ...others } = props
  return (
    <select
      className={`rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${className}`}
      {...others}
    />
  )
}

export function Textarea(props: ComponentProps<'textarea'>) {
  const { className = '', ...others } = props
  return (
    <textarea
      className={`rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${className}`}
      {...others}
    />
  )
}

export function FormLabel(props: ComponentProps<'label'> & { label: string }) {
  const { label, className, children, ...others } = props
  return (
    <div className={className}>
      <label {...others} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  )
}
