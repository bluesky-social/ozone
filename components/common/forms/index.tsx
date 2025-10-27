import { ComponentProps, forwardRef, ReactNode, useState } from 'react'
import { CopyButton } from '../CopyButton'
import { classNames } from '@/lib/util'

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

type LabelProps = { label: string | ReactNode; required?: boolean }
type CopyProps = { copyButton?: { text: string; label?: string } }

export function FormLabel(
  props: ComponentProps<'label'> &
    LabelProps &
    CopyProps & { extraLabel?: ReactNode },
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

type CheckboxProps = LabelProps &
  ComponentProps<'input'> & { className?: string; inputClassName?: string }

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function CheckboxElement(
    { label, required, className, inputClassName, id, ...rest }: CheckboxProps,
    ref,
  ) {
    const [fallbackId] = useState(
      // Make sure this rune only once per component instance
      () => `__my_checkbox-${Math.random().toString(36).substring(7)}`,
    )

    return (
      <div className={className}>
        <input
          ref={ref}
          type="checkbox"
          className={classNames(
            'h-4 w-4 rounded border-gray-300 text-indigo-600 dark:text-teal-500 focus:ring-indigo-600 dark:focus:ring-teal-500 mr-1',
            inputClassName,
          )}
          id={id ?? fallbackId}
          {...rest}
        />
        <label
          htmlFor={id ?? fallbackId}
          className="ml-1 text-sm leading-6 font-medium text-gray-900 dark:text-gray-200"
        >
          {label}
          {required && <sup className="text-red-500">*</sup>}
        </label>
      </div>
    )
  },
)

export const getTrimmedInput = (field: FormDataEntryValue | null) =>
  field?.toString().trim() ?? ''
