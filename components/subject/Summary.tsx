import { classNames, pluralize } from '@/lib/util'
import { ToolsOzoneModerationDefs } from '@atproto/api'
import {
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  FlagIcon,
  PencilSquareIcon,
  ShieldExclamationIcon,
  UserCircleIcon,
} from '@heroicons/react/24/solid'
import { ComponentProps, useState, type JSX } from 'react'
import { AccountStrike } from './AccountStrike'

export const StatView = ({
  count,
  Icon,
  appearance,
  text,
  title,
  ...rest
}: {
  count: number
  Icon: React.ComponentType<React.ComponentProps<'svg'>>
  text?: string
  appearance?: 'danger' | 'info' | 'warning' | 'success'
} & ComponentProps<'button'>) => {
  let bgColor = 'bg-gray-400 dark:text-gray-100 text-white'

  if (appearance === 'info') {
    bgColor = 'bg-blue-200 text-blue-800'
  } else if (appearance === 'danger') {
    bgColor = 'bg-red-200 text-red-800'
  } else if (appearance === 'warning') {
    bgColor = 'bg-orange-200 text-orange-800'
  } else if (appearance === 'success') {
    bgColor = 'bg-green-200 text-green-800'
  }

  return (
    <button
      type="button"
      className={classNames(
        'flex flex-row items-center gap-1 rounded px-1 text-xs',
        bgColor,
      )}
      title={title}
      aria-label={title}
      {...rest}
    >
      <Icon className="w-3 h-3" />
      {count}
      {text && <span>{text}</span>}
    </button>
  )
}

export const AccountStats = ({
  stats,
  showAll,
  onAccountTakedownClick,
  onAccountAppealClick,
}: {
  showAll: boolean
  onAccountTakedownClick?: () => void
  onAccountAppealClick?: () => void
  stats: ToolsOzoneModerationDefs.AccountStats
}) => {
  const { takedownCount, suspendCount, appealCount, reportCount } = stats
  // Dont want to make the UI noisy with appeal count if we're in summary mode and already showing takedown and suspension
  const shouldShowAppeal =
    appealCount && (showAll || !takedownCount || !suspendCount)
  // Dont want to make the UI noisy with report count if we're in summary mode and we have both takedown and suspension count
  const shouldShowReport =
    reportCount && (showAll || (!takedownCount && !suspendCount))
  const hasStats = takedownCount || suspendCount || appealCount || reportCount

  return (
    <>
      {!!hasStats && <UserCircleIcon className="w-4 h-4 dark:text-gray-200" />}
      {!!suspendCount && (
        <StatView
          appearance="danger"
          count={suspendCount}
          onClick={onAccountTakedownClick}
          text={
            showAll
              ? pluralize(suspendCount, 'Suspension', { includeCount: false })
              : ''
          }
          Icon={ShieldExclamationIcon}
          title={`This account was suspended ${pluralize(
            suspendCount,
            'time',
          )}`}
        />
      )}
      {!!takedownCount && (
        <StatView
          appearance="danger"
          count={takedownCount}
          onClick={onAccountTakedownClick}
          Icon={ShieldExclamationIcon}
          text={
            showAll
              ? pluralize(takedownCount, 'Takedown', { includeCount: false })
              : ''
          }
          title={`This account was taken down ${pluralize(
            takedownCount,
            'time',
          )}`}
        />
      )}
      {!!shouldShowAppeal && (
        <StatView
          appearance="warning"
          count={appealCount}
          onClick={onAccountAppealClick}
          text={
            showAll
              ? pluralize(appealCount, 'Appeal', { includeCount: false })
              : ''
          }
          Icon={ExclamationTriangleIcon}
          title={`This account appealed ${pluralize(appealCount, 'decision')}`}
        />
      )}
      {!!shouldShowReport && (
        <StatView
          appearance="info"
          count={reportCount}
          Icon={FlagIcon}
          text={
            showAll
              ? pluralize(reportCount, 'Report', { includeCount: false })
              : ''
          }
          title={`This account was reported ${pluralize(reportCount, 'time')}`}
        />
      )}
    </>
  )
}

export const RecordsStats = ({
  stats,
  showAll,
  onRecordTakedownClick,
  onRecordEscalationClick,
}: {
  showAll: boolean
  stats: ToolsOzoneModerationDefs.RecordsStats
  onRecordTakedownClick?: () => void
  onRecordEscalationClick?: () => void
}) => {
  const {
    totalReports,
    reportedCount,
    escalatedCount,
    appealedCount,
    pendingCount,
    processedCount,
    takendownCount,
  } = stats

  const hasStats =
    totalReports ||
    reportedCount ||
    escalatedCount ||
    appealedCount ||
    pendingCount ||
    processedCount ||
    takendownCount

  return (
    <>
      {!!hasStats && (
        <PencilSquareIcon className="w-4 h-4 dark:text-gray-200" />
      )}
      {!!takendownCount && (
        <StatView
          appearance="danger"
          count={takendownCount}
          Icon={ShieldExclamationIcon}
          text={
            showAll
              ? pluralize(takendownCount, 'Takedown', { includeCount: false })
              : ''
          }
          title={`${pluralize(
            takendownCount,
            'record',
          )} authored by this account has been taken down`}
          onClick={onRecordTakedownClick}
        />
      )}
      {!!escalatedCount && (
        <StatView
          appearance="warning"
          count={escalatedCount}
          text={
            showAll
              ? pluralize(escalatedCount, 'Escalation', { includeCount: false })
              : ''
          }
          onClick={onRecordEscalationClick}
          Icon={ExclamationTriangleIcon}
          title={`${pluralize(
            escalatedCount,
            'record',
          )} authored by this user were escalated`}
        />
      )}
      {!!reportedCount && (
        <StatView
          appearance="info"
          count={reportedCount}
          Icon={FlagIcon}
          text={showAll ? 'Reported' : ''}
          title={`${pluralize(
            reportedCount,
            'record',
          )} authored by this user reported ${pluralize(
            totalReports || 0,
            'time',
          )}`}
        />
      )}
      {showAll && !!pendingCount && (
        <StatView
          appearance="warning"
          count={pendingCount}
          text={showAll ? 'Unreviewed' : ''}
          Icon={ExclamationCircleIcon}
          title={`${pluralize(
            pendingCount,
            'record',
          )} authored by this user are pending review`}
        />
      )}
      {showAll && !!processedCount && (
        <StatView
          appearance="success"
          count={processedCount}
          text={showAll ? `Reviewed` : ''}
          Icon={ExclamationCircleIcon}
          title={`${pluralize(
            processedCount,
            'record',
          )} authored by this user have been reviewed already`}
        />
      )}
    </>
  )
}

export const SubjectSummary = ({
  stats,
  onAccountTakedownClick,
  onRecordTakedownClick,
  onAccountAppealClick,
  onRecordEscalationClick,
  onAccountStrikeClick,
}: {
  onAccountTakedownClick?: () => void
  onRecordTakedownClick?: () => void
  onAccountAppealClick?: () => void
  onRecordEscalationClick?: () => void
  onAccountStrikeClick?: () => void
  stats: {
    accountStrike?: ToolsOzoneModerationDefs.AccountStrike
    accountStats?: ToolsOzoneModerationDefs.AccountStats
    recordsStats?: ToolsOzoneModerationDefs.RecordsStats
  }
}) => {
  const [showAll, setShowAll] = useState(false)
  if (!stats) return null

  return (
    <div className="flex flex-col gap-2">
      {stats.accountStrike && (
        <AccountStrike
          size="detailed"
          accountStrike={stats.accountStrike}
          onClick={onAccountStrikeClick}
        />
      )}
      <div className="flex flex-row gap-1 items-center flex-wrap">
        {stats.accountStats && (
          <AccountStats
            showAll={showAll}
            stats={stats.accountStats}
            onAccountTakedownClick={onAccountTakedownClick}
            onAccountAppealClick={onAccountAppealClick}
          />
        )}
        {showAll && stats.recordsStats && <div className="w-full" />}
        {stats.recordsStats && (
          <RecordsStats
            showAll={showAll}
            stats={stats.recordsStats}
            onRecordTakedownClick={onRecordTakedownClick}
            onRecordEscalationClick={onRecordEscalationClick}
          />
        )}
        {stats.recordsStats && stats.accountStats && (
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
          >
            <span className="text-xs">
              {showAll ? 'Show Summary' : 'Show All'}
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
