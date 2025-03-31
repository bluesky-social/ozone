import {
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/solid'

export const Alert = ({
  type = 'info',
  title = '',
  body = '',
  showIcon,
}: {
  showIcon?: boolean
  title?: string
  body?: React.ReactNode
  type?: 'error' | 'warning' | 'info'
}) => {
  const classNames = {
    error: {
      container: 'border-red-400 bg-red-100 text-red-400',
      title: 'text-red-600',
    },
    info: {
      container: 'border-blue-800 bg-blue-200 text-blue-500',
      title: 'text-blue-800',
    },
    warning: {
      container: 'border-yellow-800 bg-yellow-200 text-yellow-600',
      title: 'text-yellow-800',
    },
  }
  const iconSize = !title || !body ? 'h-4 w-4' : 'h-6 w-6'

  return (
    <div
      className={`border text-sm rounded px-4 py-2 flex flex-row items-center ${classNames[type].container}`}
    >
      {showIcon && (
        <div className="mr-3">
          {type === 'error' && (
            <ExclamationCircleIcon className={`${iconSize} text-red-600`} />
          )}
          {type === 'warning' && (
            <ExclamationTriangleIcon
              className={`${iconSize} text-yellow-800`}
            />
          )}
          {type === 'info' && (
            <InformationCircleIcon className={`${iconSize} text-blue-800`} />
          )}
        </div>
      )}
      <div>
        {title && <h4 className={`${classNames[type].title}`}>{title}</h4>}
        {body && <p>{body}</p>}
      </div>
    </div>
  )
}
