import { ComponentProps } from 'react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export function Loading(
  props: { noPadding?: boolean } & ComponentProps<'div'>,
) {
  const { className = '', noPadding, ...others } = props
  return (
    <div
      className={`${className} text-center ${noPadding ? '' : 'p-10'}`}
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
  const { className = '', noPadding, ...others } = props
  return (
    <div
      className={`${className} text-center text-sm ${noPadding ? '' : 'p-1'}`}
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
  const { error, className = '', noPadding, ...others } = props
  return (
    <div
      className={`${className} text-center ${noPadding ? '' : 'p-10'}`}
      {...others}
    >
      <ExclamationTriangleIcon className="h-8 w-8 inline-block" />
      <br />
      {displayError(error)}
    </div>
  )
}

export function LoadingFailedDense(
  props: { error: unknown; noPadding?: boolean } & ComponentProps<'div'>,
) {
  const { error, className = '', noPadding, ...others } = props
  return (
    <div
      className={`${className} text-center text-sm ${noPadding ? '' : 'p-1'}`}
      {...others}
    >
      <ExclamationTriangleIcon className="h-4 w-4 inline-block mr-1" />
      {displayError(error)}
    </div>
  )
}

export function displayError(err: unknown) {
  let originalMessage = ''
  if (typeof err === 'string') {
    originalMessage = err
  } else if (typeof err?.['message'] === 'string') {
    originalMessage = err['message']
  }
  if (!originalMessage) {
    return displayErrorMapping.$default
  }
  return displayErrorMapping[originalMessage.toLowerCase()] ?? originalMessage
}

const displayErrorMapping = {
  'record not found': 'Record not available',
  'repo not found': 'Repo not available',
  $default: 'Something went wrong',
}
