import { ToolsOzoneSafelinkDefs } from '@atproto/api'

export const ActionTypeNames: Record<
  ToolsOzoneSafelinkDefs.ActionType,
  string
> = {
  [ToolsOzoneSafelinkDefs.BLOCK]: 'Block',
  [ToolsOzoneSafelinkDefs.WARN]: 'Warn',
  [ToolsOzoneSafelinkDefs.WHITELIST]: 'Whitelist',
}

export const PatternTypeNames: Record<
  ToolsOzoneSafelinkDefs.PatternType,
  string
> = {
  [ToolsOzoneSafelinkDefs.DOMAIN]: 'Domain',
  [ToolsOzoneSafelinkDefs.URL]: 'URL',
}

export const ReasonTypeNames: Record<
  ToolsOzoneSafelinkDefs.ReasonType,
  string
> = {
  [ToolsOzoneSafelinkDefs.CSAM]: 'CSAM',
  [ToolsOzoneSafelinkDefs.SPAM]: 'Spam',
  [ToolsOzoneSafelinkDefs.PHISHING]: 'Phishing',
  [ToolsOzoneSafelinkDefs.NONE]: 'None',
}

export const EventTypeNames: Record<ToolsOzoneSafelinkDefs.EventType, string> =
  {
    [ToolsOzoneSafelinkDefs.ADDRULE]: 'Add Rule',
    [ToolsOzoneSafelinkDefs.UPDATERULE]: 'Update Rule',
    [ToolsOzoneSafelinkDefs.REMOVERULE]: 'Remove Rule',
  }

export const getActionText = (
  action: ToolsOzoneSafelinkDefs.ActionType,
): string => {
  return ActionTypeNames[action] || action
}

export const getPatternText = (
  pattern: ToolsOzoneSafelinkDefs.PatternType,
): string => {
  return PatternTypeNames[pattern] || pattern
}

export const getReasonText = (
  reason: ToolsOzoneSafelinkDefs.ReasonType,
): string => {
  return ReasonTypeNames[reason] || reason
}

export const getEventTypeText = (
  eventType: ToolsOzoneSafelinkDefs.EventType,
): string => {
  return EventTypeNames[eventType] || eventType
}

export const createSafelinkPageLink = (params: {
  tab?: string
  search?: string
  view?: string
  edit?: string
  create?: boolean
}) => {
  const searchParams = new URLSearchParams()

  if (params.tab) searchParams.set('tab', params.tab)
  if (params.search) searchParams.set('search', params.search)
  if (params.view) searchParams.set('view', params.view)
  if (params.edit) searchParams.set('edit', params.edit)
  if (params.create) searchParams.set('create', 'true')

  return `/configure?${searchParams.toString()}`
}

export const getActionColor = (
  action: ToolsOzoneSafelinkDefs.ActionType,
): string => {
  switch (action) {
    case ToolsOzoneSafelinkDefs.BLOCK:
      return 'text-red-600 dark:text-red-400'
    case ToolsOzoneSafelinkDefs.WARN:
      return 'text-yellow-600 dark:text-yellow-400'
    case ToolsOzoneSafelinkDefs.WHITELIST:
      return 'text-green-600 dark:text-green-400'
    default:
      return 'text-gray-600 dark:text-gray-400'
  }
}
