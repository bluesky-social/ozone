import { ComponentProps, forwardRef } from 'react'
import { CopyButton } from '../CopyButton'

export const Input = forwardRef<HTMLInputElement, ComponentProps<'input'>>(
  function Input(props: ComponentProps<'input'>, ref) {
    const { className = '', ...others } = props
    return (
      <input
        ref={ref}
        className={`rounded-md border-gray-300 dark:border-teal-500 dark:bg-slate-700 shadow-sm dark:shadow-slate-700 focus:border-indigo-500 focus:ring-indigo-500 dark:focus:ring-teal-500 sm:text-sm disabled:text-gray-500 dark:text-gray-100 disabled:dark:text-gray-300 ${className}`}
        {...others}
      />
    )
  },
)

export function Select(props: ComponentProps<'select'>) {
  const { className = '', ...others } = props
  return (
    <select
      className={`rounded-md dark:bg-slate-800 dark:text-gray-100 border-gray-300 dark:border-teal-500 shadow-sm focus:border-indigo-500 dark:focus:border-teal-500 focus:ring-indigo-500 sm:text-sm ${className}`}
      {...others}
    />
  )
}

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  ComponentProps<'textarea'>
>(function Textarea(props, ref) {
  const { className = '', ...others } = props
  return (
    <textarea
      ref={ref}
      className={`rounded-md border-gray-300 dark:border-teal-500 dark:bg-slate-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:focus:ring-teal-500 sm:text-sm dark:text-gray-100 ${className}`}
      {...others}
    />
  )
})

export function RadioGroup(props: ComponentProps<'ul'>) {
  const { className = '', ...others } = props
  return (
    <ul
      className={`items-center w-full text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg sm:flex ${className}`}
      {...others}
    />
  )
}

export function RadioGroupOption(
  props: ComponentProps<'input'> & {
    name: string
    value: string
    last?: boolean
    labelClassName?: string
  },
) {
  const {
    className = '',
    value,
    name,
    required,
    disabled,
    last,
    children,
    labelClassName = '',
    ...others
  } = props
  return (
    <li
      className={`w-full border-b border-gray-200 sm:border-b-0 ${
        last ? '' : 'sm:border-r'
      } ${className}`}
    >
      <div className="flex items-center pl-3">
        <input
          id={`radio-group--${name}--${value}`}
          type="radio"
          value={value}
          name={name}
          required={required}
          disabled={disabled}
          className="w-4 h-4 text-indigo-600 dark:text-teal-600 bg-gray-100 dark:bg-slate-500 border-gray-300 focus:ring-indigo-500 dark:focus:ring-teal-500 focus:ring-2"
          {...others}
        />
        <label
          htmlFor={`radio-group--${name}--${value}`}
          className={`w-full py-3 ml-2 text-sm font-medium ${
            labelClassName || 'text-gray-900'
          }`}
        >
          {children}
        </label>
      </div>
    </li>
  )
}

type LabelProps = { label: string | JSX.Element; required?: boolean }
type CopyProps = { copyButton?: { text: string; label?: string } }

export function FormLabel(
  props: ComponentProps<'label'> &
    LabelProps &
    CopyProps & { extraLabel?: JSX.Element },
) {
  const {
    label,
    required,
    className,
    children,
    copyButton,
    extraLabel,
    ...others
  } = props
  return (
    <div className={className}>
      <label
        {...others}
        className="block text-sm font-medium text-gray-700 dark:text-gray-100 flex flex-row justify-between"
      >
        <div>
          {label}
          {required && <sup className="text-red-500">*</sup>}
          {copyButton && (
            <CopyButton
              {...copyButton}
              className="ml-1"
              title={`Copy ${copyButton.label} to clipboard`}
            />
          )}
        </div>
        {extraLabel}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  )
}

export const Checkbox = forwardRef<
  HTMLInputElement,
  LabelProps & ComponentProps<'input'>
>(function CheckboxElement(
  {
    label,
    required,
    className,
    ...rest
  }: LabelProps & ComponentProps<'input'> & { className?: string },
  ref,
) {
  return (
    <div className={className}>
      <input
        ref={ref}
        type="checkbox"
        className="h-4 w-4 rounded border-gray-300 text-indigo-600 dark:text-teal-500 focus:ring-indigo-600 dark:focus:ring-teal-500 mr-1"
        {...rest}
      />
      <label
        htmlFor={rest.name}
        className="ml-1 text-sm leading-6 font-medium text-gray-900 dark:text-gray-200"
      >
        {label}
        {required && <sup className="text-red-500">*</sup>}
      </label>
    </div>
  )
})
