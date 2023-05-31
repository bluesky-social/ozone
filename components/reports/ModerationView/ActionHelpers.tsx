import { ComAtprotoAdminDefs } from '@atproto/api'

export const actionOptions = {
  [ComAtprotoAdminDefs.ACKNOWLEDGE]: 'Acknowledge',
  [ComAtprotoAdminDefs.ESCALATE]: 'Escalate',
  [ComAtprotoAdminDefs.FLAG]: 'Flag',
  [ComAtprotoAdminDefs.TAKEDOWN]: 'Takedown',
}

const actionTextClassNames = {
  [ComAtprotoAdminDefs.TAKEDOWN]: 'text-rose-600 hover:text-rose-700',
  [ComAtprotoAdminDefs.ESCALATE]: 'text-orange-600 hover:text-orange-700',
  [ComAtprotoAdminDefs.FLAG]: 'text-yellow-600 hover:text-yellow-700',
  default: 'text-indigo-600 hover:text-indigo-900',
}

const actionBorderClassNames = {
  [ComAtprotoAdminDefs.TAKEDOWN]: 'border-rose-600 hover:border-rose-700',
  [ComAtprotoAdminDefs.ESCALATE]: 'border-orange-600 hover:border-orange-700',
  [ComAtprotoAdminDefs.FLAG]: 'border-yellow-600 hover:border-yellow-700',
  default: 'border-indigo-600 hover:border-indigo-900',
}

const actionClassNames = {
  text: actionTextClassNames,
  border: actionBorderClassNames,
}

export const getActionClassNames = ({
  action,
  prop = 'text',
}: {
  action?: string
  prop?: 'text' | 'border'
}): string => {
  const classContainer = actionClassNames[prop]
  if (!classContainer) return ''

  const defaultClassNames = classContainer.default
  if (!action) return defaultClassNames
  return classContainer[action] || defaultClassNames
}
