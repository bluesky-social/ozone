import { ComponentProps, forwardRef, LegacyRef } from 'react'

export const ButtonPrimary = forwardRef(function ButtonPrimary(props: ComponentProps<'button'>, ref: LegacyRef<HTMLButtonElement>) {
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
