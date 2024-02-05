import { ComponentProps, forwardRef, LegacyRef, ReactElement } from 'react'
import Link from 'next/link'

import { classNames } from '../../lib/util'

export const ButtonPrimary = forwardRef(function ButtonPrimary(
  props: ComponentProps<'button'>,
  ref: LegacyRef<HTMLButtonElement>,
) {
  const { className = '', ...others } = props
  return (
    <button
      ref={ref}
      type="button"
      className={`inline-flex items-center rounded border border-transparent bg-indigo-600 dark:bg-teal-600 disabled:bg-gray-400 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-teal-500 focus:ring-offset-2 ${className}`}
      {...others}
    />
  )
})

export function ButtonSecondary(props: ComponentProps<'button'>) {
  const { className = '', color, ...others } = props
  const textColor = color || 'text-indigo-700 dark:text-sky-100'
  return (
    <button
      type="button"
      className={`inline-flex items-center rounded-md border border-transparent bg-indigo-100 dark:bg-sky-700 disabled:bg-gray-100 px-4 py-2 text-base font-medium disabled:text-gray-700 hover:bg-indigo-200 dark:hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-sky-900 focus:ring-offset-2 ${textColor} ${className}`}
      {...others}
    />
  )
}

type ButtonAppearance = 'outlined' | 'primary' | 'secondary'
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'
type ActionButtonProps = {
  appearance: ButtonAppearance
  size?: ButtonSize
}

const appearanceClassNames = {
  outlined:
    'bg-transparent dark:bg-slate-800 disabled:bg-gray-300 text-black dark:text-gray-50 hover:bg-gray-500 dark:hover:bg-slate-700 focus:ring-gray-500 dark:focus:ring-slate-600 border-gray-700 dark:border-slate-600',
  primary:
    'bg-indigo-600 dark:bg-teal-600 disabled:bg-gray-400 text-white hover:bg-indigo-700 dark:hover:bg-teal-700 focus:ring-indigo-500 dark:focus:ring-teal-500 border-transparent',
}
const sizeClassNames = {
  xs: 'px-1 py-1 text-xs font-light',
  sm: 'px-2 py-1 text-sm font-light',
  md: 'px-4 py-2 text-base font-medium',
}

export const ActionButton = forwardRef(function ActionButton(
  props: ComponentProps<'button'> & ActionButtonProps,
  ref: LegacyRef<HTMLButtonElement>,
) {
  const { className = '', appearance, size, ...others } = props
  const appearanceClassName =
    appearanceClassNames[appearance] || appearanceClassNames.primary
  const sizeClassName = (size && sizeClassNames[size]) || sizeClassNames.md
  const classNames = `inline-flex items-center rounded border text-base font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${className} ${appearanceClassName} ${sizeClassName}`

  return <button ref={ref} type="button" className={classNames} {...others} />
})

export const LinkButton = (
  props: ComponentProps<typeof Link> & ActionButtonProps,
) => {
  const { className = '', appearance, size, ...others } = props
  const appearanceClassName =
    appearanceClassNames[appearance] || appearanceClassNames.primary
  const sizeClassName = (size && sizeClassNames[size]) || sizeClassNames.md
  const classNames = `inline-flex items-center rounded border shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${className} ${appearanceClassName} ${sizeClassName}`

  return <Link className={classNames} {...others} />
}

type ButtonGroupItem = ComponentProps<'button'> & {
  Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  text: string
  id: string
  isActive: boolean
}

const buttonTextSizeMap = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
}

const buttonSpaceMap = {
  xs: 'px-2 py-1',
  sm: 'px-4 py-2',
  md: 'px-5 py-3',
  lg: 'px-6 py-4',
}

export const ButtonGroup = ({
  appearance,
  size = 'sm',
  items,
}: ComponentProps<'span'> &
  ActionButtonProps & { items: ButtonGroupItem[] }) => {
  return (
    <span className="isolate inline-flex rounded-md shadow-sm sm:ml-4 my-2 sm:my-0">
      {items.map(({ id, className, Icon, text, isActive, ...rest }, i) => (
        <button
          key={id}
          type="button"
          className={classNames(
            'relative inline-flex items-center border font-medium',
            i === 0 ? 'rounded-l-md' : '',
            i === items.length - 1 ? '-ml-px rounded-r-md' : '',
            isActive
              ? 'bg-rose-600 dark:bg-teal-600 text-white border-rose-800 dark:border-teal-800'
              : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-100 border-gray-300 dark:border-slate-700',
            buttonTextSizeMap[size],
            buttonSpaceMap[size],
            className,
          )}
          {...rest}
        >
          {Icon && <Icon className="w-5 h-5 mr-1" aria-hidden="true" />}
          {text}
        </button>
      ))}
    </span>
  )
}
