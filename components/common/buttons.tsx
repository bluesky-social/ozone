import { ComponentProps, forwardRef, LegacyRef } from 'react'

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
  outlined: 'bg-transparent disabled:bg-gray-300 text-black hover:bg-gray-500 focus:ring-gray-500 border-gray-700',
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
