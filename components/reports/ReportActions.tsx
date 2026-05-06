'use client'
import { useState } from 'react'
import {
  ArrowUpCircleIcon,
  ArrowPathIcon,
  ChatBubbleLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowRightIcon,
  CpuChipIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline'
import {
  ToolsOzoneReportDefs,
  ToolsOzoneModerationDefs,
  ComAtprotoModerationDefs,
} from '@atproto/api'
import { usePermission } from '@/shell/ConfigurationContext'
import { formatDistanceToNow } from 'date-fns'
import { ActionButton } from '@/common/buttons'
import { Textarea } from '@/common/forms'
import { Dropdown } from '@/common/Dropdown'
import { useCreateActivity, useListActivities } from './hooks'

export type ReportActionType = 'label' | 'takedown' | 'revert-takedown' | null

// Mirror of backend VALID_TRANSITIONS in packages/ozone/src/report/activity.ts
const VALID_TRANSITIONS: Record<string, string[]> = {
  open: ['closed', 'escalated', 'queued', 'assigned'],
  closed: ['open'],
  escalated: ['open', 'closed'],
  queued: ['assigned', 'open', 'escalated'],
  assigned: ['open', 'closed', 'escalated'],
}

function canTransitionTo(fromState: string, toState: string): boolean {
  return VALID_TRANSITIONS[fromState]?.includes(toState) ?? false
}

const statusColors: Record<string, string> = {
  open: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  closed: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  escalated: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  queued: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  assigned: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
}

function StatusChip({ status }: { status: string }) {
  const color = statusColors[status] ?? statusColors.open
  return (
    <span className={`${color} inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium capitalize`}>
      {status}
    </span>
  )
}

type ActionType = 'escalate' | 'reopen' | 'no-action'

const ACTION_CONFIG: Record<ActionType, { activityType: string; label: string; confirmLabel: string }> = {
  escalate: { activityType: 'tools.ozone.report.defs#escalationActivity', label: 'Escalate', confirmLabel: 'Escalate report' },
  reopen: { activityType: 'tools.ozone.report.defs#reopenActivity', label: 'Re-open', confirmLabel: 'Re-open report' },
  'no-action': { activityType: 'tools.ozone.report.defs#closeActivity', label: 'No-action', confirmLabel: 'Close as no-action' },
}

function TransitionConfirmPanel({
  action,
  reportId,
  onDone,
  onResolveAppeal,
}: {
  action: ActionType
  reportId: number
  onDone: () => void
  onResolveAppeal?: () => Promise<void>
}) {
  const [note, setNote] = useState('')
  const createActivity = useCreateActivity()
  const { activityType, confirmLabel } = ACTION_CONFIG[action]

  const handleConfirm = () => {
    createActivity.mutate(
      {
        reportId,
        activity: { $type: activityType as Parameters<typeof createActivity.mutate>[0]['activity']['$type'] },
        internalNote: note.trim() || undefined,
      },
      {
        onSuccess: async () => {
          if (action === 'no-action' && onResolveAppeal) {
            await onResolveAppeal()
          }
          onDone()
        },
      },
    )
  }

  return (
    <div className="mt-2 rounded-md bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-600 p-2.5 space-y-2">
      <Textarea
        rows={2}
        placeholder="Add a note (optional)…"
        className="block w-full text-xs"
        autoFocus
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex justify-end gap-1.5">
        <button
          type="button"
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-1"
          onClick={onDone}
          disabled={createActivity.isPending}
        >
          Cancel
        </button>
        <ActionButton
          appearance="primary"
          size="sm"
          disabled={createActivity.isPending}
          onClick={handleConfirm}
        >
          {createActivity.isPending ? 'Saving…' : confirmLabel}
        </ActionButton>
      </div>
    </div>
  )
}

function NoteComposer({
  reportId,
  onDone,
}: {
  reportId: number
  onDone: () => void
}) {
  const [text, setText] = useState('')
  const createActivity = useCreateActivity()

  const handleSubmit = () => {
    if (!text.trim()) return
    createActivity.mutate(
      {
        reportId,
        activity: { $type: 'tools.ozone.report.defs#noteActivity' },
        internalNote: text.trim(),
      },
      { onSuccess: () => { setText(''); onDone() } },
    )
  }

  return (
    <div className="mt-2 space-y-1.5">
      <Textarea
        rows={2}
        placeholder="Internal note (moderators only)…"
        className="block w-full text-xs"
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex justify-end gap-1.5">
        <button
          type="button"
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-1"
          onClick={onDone}
        >
          Cancel
        </button>
        <ActionButton
          appearance="outlined"
          size="sm"
          disabled={createActivity.isPending || !text.trim()}
          onClick={handleSubmit}
        >
          Save note
        </ActionButton>
      </div>
    </div>
  )
}

export function ReportActionsBar({
  report,
  selectedAction,
  onActionSelect,
  subjectStatus,
  onResolveAppeal,
}: {
  report: ToolsOzoneReportDefs.ReportView
  selectedAction: ReportActionType
  onActionSelect: (action: ReportActionType) => void
  subjectStatus?: ToolsOzoneModerationDefs.SubjectStatusView | null
  onResolveAppeal?: () => Promise<void>
}) {
  const [pendingAction, setPendingAction] = useState<ActionType | null>(null)
  const [showNote, setShowNote] = useState(false)

  const canLabel = usePermission('canLabel')
  const canTakedown = usePermission('canTakedown')
  const isAppeal =
    report.reportType === ComAtprotoModerationDefs.REASONAPPEAL ||
    report.reportType === 'tools.ozone.report.defs#reasonAppeal'
  const isSubjectTakendown = !!subjectStatus?.takendown

  const status = report.status
  const canEscalate = canTransitionTo(status, 'escalated')
  const canReopen = status === 'closed' && canTransitionTo(status, 'open')
  const canNoAction = (status === 'open' || status === 'assigned' || status === 'escalated') && canTransitionTo(status, 'closed')
  const canAction = status === 'open' || status === 'assigned' || status === 'escalated'

  const handleActionClick = (action: ActionType) => {
    setShowNote(false)
    setPendingAction((prev) => (prev === action ? null : action))
  }

  const handleNoteClick = () => {
    setPendingAction(null)
    setShowNote((v) => !v)
  }

  const handleReportActionSelect = (action: ReportActionType) => {
    setPendingAction(null)
    setShowNote(false)
    onActionSelect(action)
  }

  const actionButtonText = selectedAction
    ? selectedAction.charAt(0).toUpperCase() + selectedAction.slice(1)
    : 'Action'

  return (
    <div className="mb-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 px-3 py-2">
      <div className="flex flex-row items-center gap-2 flex-wrap">
        {canEscalate && (
          <ActionButton
            appearance={pendingAction === 'escalate' ? 'primary' : 'outlined'}
            size="sm"
            onClick={() => handleActionClick('escalate')}
          >
            <ArrowUpCircleIcon className="h-3.5 w-3.5 mr-1 text-orange-500" />
            Escalate
          </ActionButton>
        )}
        {canNoAction && (
          <ActionButton
            appearance={pendingAction === 'no-action' ? 'primary' : 'outlined'}
            size="sm"
            onClick={() => handleActionClick('no-action')}
          >
            <NoSymbolIcon className="h-3.5 w-3.5 mr-1 text-gray-500" />
            No-action
          </ActionButton>
        )}
        {canAction && isAppeal && (
          <>
            {isSubjectTakendown && canTakedown && (
              <ActionButton
                appearance={selectedAction === 'revert-takedown' ? 'primary' : 'outlined'}
                size="sm"
                onClick={() => handleReportActionSelect('revert-takedown')}
              >
                Revert Takedown
              </ActionButton>
            )}
            {canLabel && (
              <ActionButton
                appearance={selectedAction === 'label' ? 'primary' : 'outlined'}
                size="sm"
                onClick={() => handleReportActionSelect('label')}
              >
                Label
              </ActionButton>
            )}
          </>
        )}
        {canAction && !isAppeal && (canLabel || canTakedown) && (
          <Dropdown
            items={[
              ...(canLabel ? [{
                text: 'Label',
                onClick: () => handleReportActionSelect('label'),
              }] : []),
              ...(canTakedown ? [{
                text: 'Takedown',
                onClick: () => handleReportActionSelect('takedown'),
              }] : []),
            ]}
            className={`inline-flex justify-center items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium shadow-sm ${
              selectedAction
                ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-slate-700'
            }`}
          >
            {actionButtonText}
            <ChevronDownIcon className="h-4 w-4" />
          </Dropdown>
        )}
        {canReopen && (
          <ActionButton
            appearance={pendingAction === 'reopen' ? 'primary' : 'outlined'}
            size="sm"
            onClick={() => handleActionClick('reopen')}
          >
            <ArrowPathIcon className="h-3.5 w-3.5 mr-1 text-blue-500" />
            Re-open
          </ActionButton>
        )}

        <span className="flex-1" />

        <button
          type="button"
          className={`inline-flex items-center gap-1 text-xs px-1 ${showNote ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
          onClick={handleNoteClick}
          title="Internal note (moderators only)"
        >
          <ChatBubbleLeftIcon className="h-3.5 w-3.5" />
          Note
        </button>
      </div>

      {pendingAction && (
        <TransitionConfirmPanel
          action={pendingAction}
          reportId={report.id}
          onDone={() => setPendingAction(null)}
          onResolveAppeal={isAppeal ? onResolveAppeal : undefined}
        />
      )}

      {showNote && !pendingAction && (
        <NoteComposer reportId={report.id} onDone={() => setShowNote(false)} />
      )}
    </div>
  )
}

// Maps activity $type to the implied new status for state-change activities
const ACTIVITY_TO_STATUS: Record<string, string> = {
  'tools.ozone.report.defs#queueActivity': 'queued',
  'tools.ozone.report.defs#assignmentActivity': 'assigned',
  'tools.ozone.report.defs#escalationActivity': 'escalated',
  'tools.ozone.report.defs#closeActivity': 'closed',
  'tools.ozone.report.defs#reopenActivity': 'open',
}

type ActivityPayload = { $type: string; previousStatus?: string }

function ActivityItem({ activity }: { activity: ToolsOzoneReportDefs.ReportActivityView }) {
  const payload = (activity as unknown as { activity: ActivityPayload }).activity
  const activityType = payload?.$type ?? ''
  const toStatus = ACTIVITY_TO_STATUS[activityType]
  const isStateChange = !!toStatus
  const noteText = (activity as unknown as { internalNote?: string }).internalNote
  const timeAgo = formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })
  const moderator = (activity as unknown as { moderator?: { profile?: { handle?: string; displayName?: string } } }).moderator
  const displayName = moderator?.profile?.handle || activity.createdBy

  return (
    <div className="relative flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isStateChange
            ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
        }`}>
          {isStateChange
            ? <ArrowRightIcon className="h-3.5 w-3.5" />
            : <ChatBubbleLeftIcon className="h-3.5 w-3.5" />
          }
        </div>
      </div>

      <div className="flex-1 pb-4 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {isStateChange && (
            <>
              {payload.previousStatus && (
                <>
                  <StatusChip status={payload.previousStatus} />
                  <ArrowRightIcon className="h-3 w-3 text-gray-400 shrink-0" />
                </>
              )}
              <StatusChip status={toStatus} />
            </>
          )}
          {!isStateChange && (
            <span className="text-gray-500 dark:text-gray-400 font-medium">
              Note
            </span>
          )}
          {activity.isAutomated && (
            <span className="inline-flex items-center gap-0.5 rounded bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-500 dark:text-slate-400">
              <CpuChipIcon className="h-2.5 w-2.5" />
              automated
            </span>
          )}
        </div>

        {noteText && (
          <p className="mt-0.5 text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
            {noteText}
          </p>
        )}

        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
          <a
            href={`/reports?quickOpen=${encodeURIComponent(activity.createdBy)}`}
            className="font-mono hover:text-blue-500 truncate max-w-[180px]"
            title={activity.createdBy}
          >
            {displayName}
          </a>
          <span>·</span>
          <span>{timeAgo}</span>
        </div>
      </div>
    </div>
  )
}

export function ActivityTimeline({ reportId }: { reportId: number }) {
  const [open, setOpen] = useState(true)
  const { data: activities, isLoading } = useListActivities(reportId)

  return (
    <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg"
        onClick={() => setOpen((v) => !v)}
      >
        <span>Activity{activities?.length ? ` (${activities.length})` : ''}</span>
        {open ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
      </button>

      {open && (
        <div className="px-4 pb-2 pt-1">
          {isLoading && (
            <p className="py-4 text-center text-xs text-gray-400">Loading…</p>
          )}
          {!isLoading && !activities?.length && (
            <p className="py-4 text-center text-xs text-gray-400">No activity yet</p>
          )}
          {!!activities?.length && (
            <div className="relative">
              <div className="absolute left-3.5 top-3 bottom-3 w-px bg-gray-200 dark:bg-gray-700" />
              {activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
