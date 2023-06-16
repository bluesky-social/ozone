import { ComponentProps, forwardRef, LegacyRef, ReactElement } from 'react'

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
      className={`inline-flex items-center rounded border border-transparent bg-indigo-600 disabled:bg-gray-400 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${className}`}
      {...others}
    />
  )
})

export function ButtonSecondary(props: ComponentProps<'button'>) {
  const { className = '', color, ...others } = props
  const textColor = color || 'text-indigo-700'
  return (
    <button
      type="button"
      className={`inline-flex items-center rounded-md border border-transparent bg-indigo-100 disabled:bg-gray-100 px-4 py-2 text-base font-medium disabled:text-gray-700 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${textColor} ${className}`}
      {...others}
    />
  )
}

type ButtonAppearance = 'outlined' | 'primary' | 'secondary'
type ActionButtonProps = {
  appearance: ButtonAppearance
}

const appearanceClassNames = {
  outlined:
    'bg-transparent disabled:bg-gray-300 text-black hover:bg-gray-500 focus:ring-gray-500 border-gray-700',
  primary:
    'bg-indigo-600 disabled:bg-gray-400 text-white hover:bg-indigo-700 focus:ring-indigo-500 border-transparent',
}

export const ActionButton = forwardRef(function ActionButton(
  props: ComponentProps<'button'> & ActionButtonProps,
  ref: LegacyRef<HTMLButtonElement>,
) {
  const { className = '', appearance, ...others } = props
  const appearanceClassName =
    appearanceClassNames[appearance] || appearanceClassNames.primary
  const classNames = `inline-flex items-center rounded border px-4 py-2 text-base font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${className} ${appearanceClassName}`

  return <button ref={ref} type="button" className={classNames} {...others} />
})

type ButtonGroupItem = ComponentProps<'button'> & {
  Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  text: string
  id: string
  isActive: boolean
}

export const ButtonGroup = ({
  appearance,
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
            'relative inline-flex items-center  border px-4 py-2 text-sm font-medium',
            i === 0 ? 'rounded-l-md' : '',
            i === items.length - 1 ? '-ml-px rounded-r-md' : '',
            isActive
              ? 'bg-rose-600 text-white border-rose-800'
              : 'bg-white text-gray-700 border-gray-300',
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
