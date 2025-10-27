import { LabelChip } from '@/common/labels/List'
import { classNames, pluralize } from '@/lib/util'
import { ToolsOzoneModerationDefs } from '@atproto/api'
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid'
import { formatDistanceToNow } from 'date-fns'

export const AccountStrike = ({
  accountStrike,
  size,
  onClick,
}: {
  accountStrike?: ToolsOzoneModerationDefs.AccountStrike
  size?: 'sm' | 'detailed'
  onClick?: () => void
}) => {
  if (!accountStrike?.activeStrikeCount) {
    return null
  }

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'Unknown'
    try {
      return new Date(timestamp).toLocaleString()
    } catch {
      return timestamp
    }
  }

  const formatRelativeTime = (timestamp?: string) => {
    if (!timestamp) return 'Unknown'
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    } catch {
      return timestamp
    }
  }

  // Color coding based on strike count segments
  // 1-4: yellow, 5-8: orange, 9-12: deep orange, 13+: red
  const getStrikeColors = (count: number) => {
    if (count >= 13) {
      return {
        border: 'border-red-600 dark:border-red-500',
        bg: 'bg-red-100 dark:bg-red-900/20',
        text: 'text-red-800 dark:text-red-300',
        icon: 'text-red-700 dark:text-red-400',
      }
    } else if (count >= 9) {
      return {
        border: 'border-orange-600 dark:border-orange-500',
        bg: 'bg-orange-100 dark:bg-orange-900/20',
        text: 'text-orange-800 dark:text-orange-300',
        icon: 'text-orange-700 dark:text-orange-400',
      }
    } else if (count >= 5) {
      return {
        border: 'border-orange-500 dark:border-orange-400',
        bg: 'bg-orange-50 dark:bg-orange-900/10',
        text: 'text-orange-700 dark:text-orange-300',
        icon: 'text-orange-600 dark:text-orange-400',
      }
    } else {
      return {
        border: 'border-yellow-500 dark:border-yellow-400',
        bg: 'bg-yellow-50 dark:bg-yellow-900/10',
        text: 'text-yellow-800 dark:text-yellow-300',
        icon: 'text-yellow-700 dark:text-yellow-400',
      }
    }
  }

  const colors = getStrikeColors(accountStrike.activeStrikeCount)

  const tooltipContent = [
    `Active strikes: ${accountStrike.activeStrikeCount}`,
    accountStrike.totalStrikeCount !== undefined &&
      `Total strikes (including expired): ${accountStrike.totalStrikeCount}`,
    accountStrike.lastStrikeAt &&
      `Last strike: ${formatTimestamp(accountStrike.lastStrikeAt)}`,
    accountStrike.firstStrikeAt &&
      `First strike: ${formatTimestamp(accountStrike.firstStrikeAt)}`,
  ]
    .filter(Boolean)
    .join(' • ')

  // Detailed box view for event stream
  if (size === 'detailed') {
    const content = (
      <div className="flex flex-row items-center gap-2 flex-wrap">
        <ExclamationTriangleIcon className={classNames('h-5 w-5', colors.icon)} />
        <span className="font-semibold">
          {pluralize(accountStrike.activeStrikeCount, 'active strike')}
        </span>
        {accountStrike.totalStrikeCount !== undefined &&
          accountStrike.totalStrikeCount > accountStrike.activeStrikeCount && (
            <span className="text-xs">
              ({accountStrike.totalStrikeCount} total incl. expired)
            </span>
          )}
        {(accountStrike.lastStrikeAt || accountStrike.firstStrikeAt) && (
          <span className="text-xs text-gray-500 dark:text-gray-400">•</span>
        )}
        {accountStrike.lastStrikeAt && (
          <span
            title={formatTimestamp(accountStrike.lastStrikeAt)}
            className="text-xs underline decoration-dotted cursor-help"
          >
            Last: {formatRelativeTime(accountStrike.lastStrikeAt)}
          </span>
        )}
        {accountStrike.firstStrikeAt && (
          <span
            title={formatTimestamp(accountStrike.firstStrikeAt)}
            className="text-xs underline decoration-dotted cursor-help"
          >
            First: {formatRelativeTime(accountStrike.firstStrikeAt)}
          </span>
        )}
      </div>
    )

    if (onClick) {
      return (
        <button
          type="button"
          onClick={onClick}
          className={classNames(
            'w-full text-left border text-sm rounded px-3 py-2 transition-colors',
            colors.border,
            colors.bg,
            colors.text,
            'hover:opacity-80',
          )}
        >
          {content}
        </button>
      )
    }

    return (
      <div
        className={classNames(
          'border text-sm rounded px-3 py-2',
          colors.border,
          colors.bg,
          colors.text,
        )}
      >
        {content}
      </div>
    )
  }

  // Compact button/badge view for table
  const buttonClassName = classNames(
    'flex flex-row items-center gap-1 rounded px-1 text-xs',
    colors.bg,
    colors.text,
  )

  if (onClick) {
    return (
      <button
        type="button"
        className={buttonClassName}
        title={tooltipContent}
        onClick={onClick}
        aria-label={tooltipContent}
      >
        <ExclamationTriangleIcon className={classNames('w-3 h-3', colors.icon)} />
        {accountStrike.activeStrikeCount}
      </button>
    )
  }

  return (
    <LabelChip
      className={classNames(
        'flex flex-row gap-1 items-center rounded',
        colors.bg,
        colors.text,
        size === 'sm' ? 'text-xs px-1 py-0' : 'px-2 py-0.5',
      )}
      title={tooltipContent}
    >
      <ExclamationTriangleIcon className={classNames('h-3 w-3', colors.icon)} />
      {accountStrike.activeStrikeCount}
    </LabelChip>
  )
}
