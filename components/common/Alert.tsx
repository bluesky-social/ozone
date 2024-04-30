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
      container: 'border-blue-800 bg-blue-200 text-blue-800',
      title: 'text-blue-800',
    },
    warning: {
      container: 'border-yellow-800 bg-yellow-200 text-yellow-800',
      title: 'text-yellow-800',
    },
  }
  return (
    <div
      className={`border text-sm rounded px-4 py-2 ${classNames[type].container}`}
    >
      {title && <h4 className={`${classNames[type].title}`}>{title}</h4>}
      {body && <p>{body}</p>}
    </div>
  )
}
