import { ToolsOzoneSafelinkDefs } from '@atproto/api'

export const ActionTypeNames: Record<string, string> = {
  block: 'Block',
  warn: 'Warn',
  whitelist: 'Whitelist',
}

export const PatternTypeNames: Record<string, string> = {
  domain: 'Domain',
  url: 'URL',
}

export const ReasonTypeNames: Record<string, string> = {
  csam: 'CSAM',
  spam: 'Spam',
  phishing: 'Phishing',
  none: 'None',
}

export const EventTypeNames: Record<string, string> = {
  addRule: 'Add',
  updateRule: 'Update',
  removeRule: 'Remove',
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
  search?: string
  view?: string
  edit?: string
  create?: boolean
  url?: string
  urls?: string[]
  pattern?: ToolsOzoneSafelinkDefs.PatternType
}) => {
  const searchParams = new URLSearchParams({ tab: 'safelink' })

  if (params.search) searchParams.set('search', params.search)
  if (params.view) searchParams.set('view', params.view)
  if (params.url) searchParams.set('url', params.url)
  if (params.urls?.length) searchParams.set('urls', params.urls.join(','))
  if (params.pattern) searchParams.set('pattern', params.pattern)

  return `/configure?${searchParams.toString()}`
}

export const createSafelinkEventsLink = (
  url: string,
  pattern: ToolsOzoneSafelinkDefs.PatternType,
) => {
  return createSafelinkPageLink({
    view: 'events',
    urls: [url],
    pattern,
  })
}

export const createSafelinkEditLink = (
  url: string,
  pattern: ToolsOzoneSafelinkDefs.PatternType,
) => {
  return createSafelinkPageLink({
    view: 'edit',
    url,
    pattern,
  })
}

export const getActionColor = (
  action: ToolsOzoneSafelinkDefs.ActionType,
): string => {
  switch (action) {
    case 'block':
      return 'text-red-600 dark:text-red-400'
    case 'warn':
      return 'text-yellow-600 dark:text-yellow-400'
    case 'whitelist':
      return 'text-green-600 dark:text-green-400'
    default:
      return 'text-gray-600 dark:text-gray-400'
  }
}

export interface SearchQueryAnalysis {
  isUrl: boolean
  isDomain: boolean
  value: string
}

export const parseUrlInput = (query: string): SearchQueryAnalysis => {
  if (!query.trim()) {
    return {
      isUrl: false,
      isDomain: false,
      value: '',
    }
  }

  const trimmedQuery = query.trim()

  // Check if it's a URL (has protocol)
  const urlPattern = /^https?:\/\//i
  if (urlPattern.test(trimmedQuery)) {
    return {
      isUrl: true,
      isDomain: false,
      value: trimmedQuery,
    }
  }

  // Check if it's a domain-like string
  // Domain should have at least one dot and no protocol, spaces, or special URL characters
  const domainPattern =
    /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  if (domainPattern.test(trimmedQuery) && trimmedQuery.includes('.')) {
    return {
      isUrl: false,
      isDomain: true,
      value: trimmedQuery,
    }
  }

  // If it doesn't match URL or domain patterns, treat as domain for broader matching
  return {
    isUrl: false,
    isDomain: true,
    value: trimmedQuery,
  }
}

export const validatePatternInput = (
  url: string,
  pattern: ToolsOzoneSafelinkDefs.PatternType,
): { isValid: boolean; error?: string } => {
  const analysis = parseUrlInput(url)

  if (!analysis.value) {
    return {
      isValid: false,
      error: 'URL/domain cannot be empty',
    }
  }

  if (pattern === 'url') {
    if (!analysis.isUrl) {
      return {
        isValid: false,
        error:
          'Pattern is set to URL but input is not a valid URL (must start with http:// or https://)',
      }
    }
  } else if (pattern === 'domain') {
    if (analysis.isUrl) {
      return {
        isValid: false,
        error:
          'Pattern is set to Domain but input appears to be a URL. Please use only the domain name (e.g., example.com)',
      }
    }
  }

  return { isValid: true }
}
