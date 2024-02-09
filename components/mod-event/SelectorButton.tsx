import { useMemo } from 'react'
import { ComAtprotoAdminDefs } from '@atproto/api'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import { Dropdown } from '@/common/Dropdown'
import { MOD_EVENTS } from './constants'

const actions = [
  { text: 'Acknowledge', key: MOD_EVENTS.ACKNOWLEDGE },
  { text: 'Escalate', key: MOD_EVENTS.ESCALATE },
  { text: 'Label', key: MOD_EVENTS.LABEL },
  { text: 'Mute', key: MOD_EVENTS.MUTE },
  { text: 'Takedown', key: MOD_EVENTS.TAKEDOWN },
  { text: 'Comment', key: MOD_EVENTS.COMMENT },
  {
    text: 'Reverse Takedown',
    key: MOD_EVENTS.REVERSE_TAKEDOWN,
  },
  {
    text: 'Unmute',
    key: MOD_EVENTS.UNMUTE,
  },
  {
    text: 'Appeal',
    key: MOD_EVENTS.REPORT,
  },
  {
    text: 'Resolve Appeal',
    key: MOD_EVENTS.RESOLVE_APPEAL,
  },
]
const actionsByKey = actions.reduce((acc, action) => {
  acc[action.key] = action.text
  return acc
}, {})

export const ModEventSelectorButton = ({
  subjectStatus,
  selectedAction,
  setSelectedAction,
}: {
  subjectStatus?: ComAtprotoAdminDefs.SubjectStatusView | null
  selectedAction: string
  setSelectedAction: (action: string) => void
}) => {
  const availableActions = useMemo(() => {
    return actions.filter(({ key, text }) => {
      // Don't show resolve appeal action if subject is not already in appealed status
      if (key === MOD_EVENTS.RESOLVE_APPEAL && !subjectStatus?.appealed) {
        return false
      }
      // Don't show appeal action if subject is already in appealed status
      if (
        key === MOD_EVENTS.REPORT &&
        text === 'Appeal' &&
        subjectStatus?.appealed
      ) {
        return false
      }
      // Don't show takedown action if subject is already takendown
      if (key === MOD_EVENTS.TAKEDOWN && subjectStatus?.takendown) {
        return false
      }
      // Don't show reverse takedown action if subject is not takendown
      if (key === MOD_EVENTS.REVERSE_TAKEDOWN && !subjectStatus?.takendown) {
        return false
      }
      // Don't show mute action if subject is already muted
      if (key === MOD_EVENTS.MUTE && subjectStatus?.muteUntil) {
        return false
      }
      // Don't show unmute action if subject is not muted
      if (key === MOD_EVENTS.UNMUTE && !subjectStatus?.muteUntil) {
        return false
      }
      // Don't show escalate action if subject is already escalated
      if (
        key === MOD_EVENTS.ESCALATE &&
        subjectStatus?.reviewState === ComAtprotoAdminDefs.REVIEWESCALATED
      ) {
        return false
      }

      return true
    })
  }, [
    subjectStatus?.takendown,
    subjectStatus?.muteUntil,
    subjectStatus?.reviewState,
    subjectStatus?.appealed,
  ])
  return (
    <Dropdown
      className="inline-flex justify-center rounded-md border border-gray-300 dark:border-teal-500 bg-white dark:bg-slate-800 dark:text-gray-100 dark:focus:border-teal-500  dark px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700"
      items={availableActions.map(({ key, text }) => ({
        text,
        onClick: () => setSelectedAction(key),
      }))}
    >
      {actionsByKey[selectedAction] || 'Action'}

      <ChevronDownIcon
        className="ml-2 -mr-1 h-5 w-5 text-violet-200 hover:text-violet-100"
        aria-hidden="true"
      />
    </Dropdown>
  )
}
