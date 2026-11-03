import { classNames } from '@/lib/util'
import { ShieldExclamationIcon } from '@heroicons/react/20/solid'

export const TakedownIcon = ({
  takendown,
  className,
}: {
  takendown?: boolean
  className?: string
}) => {
  if (!takendown) return null

  return (
    <ShieldExclamationIcon
      title="Taken Down"
      aria-label="Taken Down"
      aria-hidden={false}
      className={classNames('text-red-800 dark:text-red-600', className)}
    />
  )
}
