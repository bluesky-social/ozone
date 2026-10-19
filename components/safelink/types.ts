import type { ToolsOzoneSafelinkDefs } from '@atproto/api'

export const DEFAULT_SAFELINK_SOURCE = 'ozone/default'

export type SafelinkRule = ToolsOzoneSafelinkDefs.UrlRule

export type SafelinkEvent = ToolsOzoneSafelinkDefs.Event

export type SafelinkRuleData = Pick<
  ToolsOzoneSafelinkDefs.UrlRule,
  'url' | 'pattern' | 'action' | 'reason' | 'comment'
>

export const getSafelinkSource = (rule: { source?: string }): string =>
  rule.source ?? DEFAULT_SAFELINK_SOURCE
