import { ComponentProps } from 'react'
import { ShieldExclamationIcon } from '@heroicons/react/24/solid'

export function ModActionIcon(props: ComponentProps<'svg'>) {
  const { className, ...others } = props
  return (
    <ShieldExclamationIcon
      className={`inline-block ${className}`}
      {...others}
    />
  )
}
