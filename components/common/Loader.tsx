import { ComponentProps } from 'react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export function Loading(
  props: { noPadding?: boolean } & ComponentProps<'div'>,
) {
  const { className, noPadding, ...others } = props
  return (
    <div
      className={`text-center ${noPadding ? '' : 'p-10'} ${className}`}
      {...others}
    >
      <div
        className="animate-spin inline-block w-8 h-8 border-[3px] border-current border-t-transparent text-blue-600 rounded-full"
        role="status"
        aria-label="loading"
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  )
}

export function LoadingDense(
  props: { noPadding?: boolean } & ComponentProps<'div'>,
) {
  const { className, noPadding, ...others } = props
  return (
    <div
      className={`text-center text-sm ${noPadding ? '' : 'p-1'} ${className}`}
      {...others}
    >
      <div
        className="animate-spin inline-block w-4 h-4 border-[3px] border-current border-t-transparent text-blue-600 rounded-full"
        role="status"
        aria-label="loading"
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  )
}

export function LoadingFailed(
  props: { error: unknown; noPadding?: boolean } & ComponentProps<'div'>,
) {
  const { error, className, noPadding, ...others } = props
  return (
    <div
      className={`text-center ${noPadding ? '' : 'p-10'} ${className}`}
      {...others}
    >
      <ExclamationTriangleIcon className="h-8 w-8 inline-block" />
      <br />
      {typeof error === 'string' && error}
      {typeof error !== 'string' &&
        (error?.['message'] || 'Something went wrong')}
    </div>
  )
}

export function LoadingFailedDense(
  props: { error: unknown; noPadding?: boolean } & ComponentProps<'div'>,
) {
  const { error, className, noPadding, ...others } = props
  return (
    <div
      className={`text-center text-sm ${noPadding ? '' : 'p-1'} ${className}`}
      {...others}
    >
      <ExclamationTriangleIcon className="h-4 w-4 inline-block mr-1" />
      {typeof error === 'string' && error}
      {typeof error !== 'string' &&
        (error?.['message'] || 'Something went wrong')}
    </div>
  )
}
