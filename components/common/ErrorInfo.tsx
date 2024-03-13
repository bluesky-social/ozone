import { ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/20/solid'
import { ComponentProps } from 'react'

export function ErrorInfo({
  children,
  type = 'error',
  className = '',
  ...others
}: ComponentProps<'div'> & { type?: 'error' | 'warn' }) {
  return (
    <div
      className={`rounded-md p-4 mt-4 ${
        type === 'error' ? 'bg-red-50' : 'bg-yellow-50'
      }  ${className}`}
      {...others}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          {type === 'error' && (
            <XCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
          )}
          {type === 'warn' && (
            <ExclamationTriangleIcon
              className="h-5 w-5 text-yellow-400"
              aria-hidden="true"
            />
          )}
        </div>
        <div className="ml-3">
          <h3
            className={`text-sm font-medium break-words ${
              type === 'error' ? 'text-red-800' : 'text-yellow-800'
            }`}
          >
            {children}
          </h3>
        </div>
      </div>
    </div>
  )
}
