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
  XMarkIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline'
import { ToolsOzoneReportDefs } from '@atproto/api'
import { formatDistanceToNow } from 'date-fns'
import { ActionButton } from '@/common/buttons'
import { Textarea } from '@/common/forms'
import { useCreateActivity, useListActivities } from './hooks'

// Mirror of backend VALID_TRANSITIONS in packages/ozone/src/report/activity.ts
const VALID_TRANSITIONS: Record<string, string[]> = {
  open: ['closed', 'escalated', 'queued', 'assigned'],
  closed: ['open'],
  escalated: ['open', 'closed'],
  queued: ['assigned', 'open'],
  assigned: ['open', 'closed', 'escalated'],
}

function canTransitionTo(fromState: string, toState: string): boolean {
  return VALID_TRANSITIONS[fromState]?.includes(toState) ?? false
}

// ── Status badge colours ────────────────────────────────────────────────────
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

// ── Transition action config ────────────────────────────────────────────────
type ActionType = 'escalate' | 'reopen' | 'no-action'

const ACTION_CONFIG: Record<ActionType, { toState: string; label: string; confirmLabel: string }> = {
  escalate: { toState: 'escalated', label: 'Escalate', confirmLabel: 'Escalate report' },
  reopen: { toState: 'open', label: 'Re-open', confirmLabel: 'Re-open report' },
  'no-action': { toState: 'closed', label: 'No-action', confirmLabel: 'Close as no-action' },
}

// ── Inline transition confirm panel ────────────────────────────────────────
function TransitionConfirmPanel({
  action,
  reportId,
  onDone,
}: {
  action: ActionType
  reportId: number
  onDone: () => void
}) {
  const [note, setNote] = useState('')
  const createActivity = useCreateActivity()
  const { toState, confirmLabel } = ACTION_CONFIG[action]

  const handleConfirm = () => {
    createActivity.mutate(
      { reportId, action: 'status_change', toState, note: note.trim() || undefined },
      { onSuccess: onDone },
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

// ── Standalone note composer ────────────────────────────────────────────────
function NoteComposer({ reportId, onDone }: { reportId: number; onDone: () => void }) {
  const [text, setText] = useState('')
  const createActivity = useCreateActivity()

  const handleSubmit = () => {
    if (!text.trim()) return
    createActivity.mutate(
      { reportId, action: 'note', note: text.trim() },
      { onSuccess: () => { setText(''); onDone() } },
    )
  }

  return (
    <div className="mt-2 space-y-1.5">
      <Textarea
        rows={2}
        placeholder="Add a note…"
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

// ── Report Actions Bar ──────────────────────────────────────────────────────
export function ReportActionsBar({
  report,
  showActionForm,
  onToggleActionForm,
}: {
  report: ToolsOzoneReportDefs.ReportView
  showActionForm: boolean
  onToggleActionForm: () => void
}) {
  const [pendingAction, setPendingAction] = useState<ActionType | null>(null)
  const [showNote, setShowNote] = useState(false)

  const status = report.status
  const canEscalate = canTransitionTo(status, 'escalated')
  const canReopen = status === 'closed' && canTransitionTo(status, 'open')
  const canNoAction = (status === 'assigned' || status === 'escalated') && canTransitionTo(status, 'closed')
  const canAction = status === 'open' || status === 'assigned' || status === 'escalated'

  const handleActionClick = (action: ActionType) => {
    setShowNote(false)
    setPendingAction((prev) => (prev === action ? null : action))
  }

  const handleNoteClick = () => {
    setPendingAction(null)
    setShowNote((v) => !v)
  }

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
        {canAction && (
          <ActionButton
            appearance={showActionForm ? 'primary' : 'outlined'}
            size="sm"
            onClick={onToggleActionForm}
          >
            Action
          </ActionButton>
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
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          onClick={handleNoteClick}
        >
          {showNote
            ? <><XMarkIcon className="h-3.5 w-3.5" />Cancel note</>
            : <><ChatBubbleLeftIcon className="h-3.5 w-3.5" />Add note</>
          }
        </button>
      </div>

      {pendingAction && (
        <TransitionConfirmPanel
          action={pendingAction}
          reportId={report.id}
          onDone={() => setPendingAction(null)}
        />
      )}

      {showNote && !pendingAction && (
        <NoteComposer reportId={report.id} onDone={() => setShowNote(false)} />
      )}
    </div>
  )
}

// ── Activity Timeline ───────────────────────────────────────────────────────
function ActivityItem({ activity }: { activity: ToolsOzoneReportDefs.ReportActivityView }) {
  const isStatusChange = activity.action === 'status_change'
  const timeAgo = formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })

  return (
    <div className="relative flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isStatusChange
            ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
        }`}>
          {isStatusChange
            ? <ArrowRightIcon className="h-3.5 w-3.5" />
            : <ChatBubbleLeftIcon className="h-3.5 w-3.5" />
          }
        </div>
      </div>

      <div className="flex-1 pb-4 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {isStatusChange && activity.fromState && activity.toState && (
            <>
              <StatusChip status={activity.fromState} />
              <ArrowRightIcon className="h-3 w-3 text-gray-400 shrink-0" />
              <StatusChip status={activity.toState} />
            </>
          )}
          {!isStatusChange && (
            <span className="text-gray-500 dark:text-gray-400 font-medium">Note</span>
          )}
          {activity.isAutomated && (
            <span className="inline-flex items-center gap-0.5 rounded bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-500 dark:text-slate-400">
              <CpuChipIcon className="h-2.5 w-2.5" />
              automated
            </span>
          )}
        </div>

        {activity.note && (
          <p className="mt-0.5 text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
            {activity.note}
          </p>
        )}

        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
          <a
            href={`/reports?quickOpen=${encodeURIComponent(activity.createdBy)}`}
            className="font-mono hover:text-blue-500 truncate max-w-[180px]"
            title={activity.createdBy}
          >
            {activity.createdBy}
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
