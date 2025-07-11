import { LabelChip } from '@/common/labels/List'
import {
  getActionColor,
  getActionText,
  getEventTypeText,
  getPatternText,
  getReasonText,
} from './helpers'
import { ToolsOzoneSafelinkDefs } from '@atproto/api'
import { CopyButton } from '@/common/CopyButton'

export const SafelinkPattern = ({
  rule,
}: {
  rule: ToolsOzoneSafelinkDefs.UrlRule | ToolsOzoneSafelinkDefs.Event
}) => {
  return (
    <LabelChip className="dark:bg-slate-600 dark:text-gray-200 -ml-0.5">
      {getPatternText(rule.pattern)}
    </LabelChip>
  )
}

export const SafelinkAction = ({
  rule,
}: {
  rule: ToolsOzoneSafelinkDefs.UrlRule | ToolsOzoneSafelinkDefs.Event
}) => {
  return (
    <span className={`${getActionColor(rule.action)}`}>
      {getActionText(rule.action)}
    </span>
  )
}

export const SafelinkReason = ({
  rule,
}: {
  rule: ToolsOzoneSafelinkDefs.UrlRule | ToolsOzoneSafelinkDefs.Event
}) => {
  return (
    <span className="text-gray-600 dark:text-gray-400">
      {getReasonText(rule.reason)}
    </span>
  )
}

export const SafelinkEventType = ({
  event,
}: {
  event: ToolsOzoneSafelinkDefs.Event
}) => {
  return (
    <LabelChip className="dark:bg-slate-600 dark:text-gray-200 -ml-0.5">
      {getEventTypeText(event.eventType)}
    </LabelChip>
  )
}

export const SafelinkUrl = ({
  rule,
}: {
  rule: ToolsOzoneSafelinkDefs.UrlRule | ToolsOzoneSafelinkDefs.Event
}) => {
  return (
    <div className="text-sm mb-2 break-all">
      <CopyButton
        text={rule.url}
        className="mr-1 inline-block"
        title={`Copy ${rule.pattern} ${rule.url} to clipboard`}
      />
      <a target="_blank" href={rule.url} className="underline">
        {rule.url}
      </a>
    </div>
  )
}
