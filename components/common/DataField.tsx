import { classNames } from '@/lib/util'
import { ReactNode } from 'react'
import { CopyButton } from './CopyButton'

export type DataFieldProps = {
  label: ReactNode
  labelText?: string
  value?: string
  showCopyButton?: boolean
  children?: ReactNode
  shouldTruncateValue?: boolean
}

export const DataField = ({
  label,
  labelText,
  value,
  children,
  showCopyButton,
  shouldTruncateValue,
}: DataFieldProps) => {
  const dataClasses = classNames(
    'mt-1 text-sm text-gray-900 dark:text-gray-200',
    shouldTruncateValue ? 'truncate' : 'break-words',
  )
  return (
    <div className="sm:col-span-1">
      <dt className="text-sm font-medium text-gray-500 dark:text-gray-50 flex items-center">
        {label}
        {showCopyButton && value && (
          <CopyButton
            text={value}
            className="ml-1"
            label={label}
            labelText={labelText}
            title={`Copy ${label} to clipboard`}
          />
        )}
      </dt>
      <dd className={dataClasses} title={value}>
        {children ?? value}
      </dd>
    </div>
  )
}
