import { useMemo } from 'react'
import { ToolsOzoneModerationDefs } from '@atproto/api'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import { Dropdown } from '@/common/Dropdown'
import { MOD_EVENTS } from './constants'
import { isReporterMuted, isSubjectMuted } from '@/subject/helpers'
import { DM_DISABLE_TAG } from '@/lib/constants'

const actions = [
  { text: 'Acknowledge', key: MOD_EVENTS.ACKNOWLEDGE },
  { text: 'Escalate', key: MOD_EVENTS.ESCALATE },
  { text: 'Label', key: MOD_EVENTS.LABEL },
  { text: 'Tag', key: MOD_EVENTS.TAG },
  { text: 'Mute', key: MOD_EVENTS.MUTE },
  { text: 'Mute Reporter', key: MOD_EVENTS.MUTE_REPORTER },
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
    text: 'Unmute Reporter',
    key: MOD_EVENTS.UNMUTE_REPORTER,
  },
  {
    text: 'Appeal',
    key: MOD_EVENTS.REPORT,
  },
  {
    text: 'Resolve Appeal',
    key: MOD_EVENTS.RESOLVE_APPEAL,
  },
  {
    text: 'Divert',
    key: MOD_EVENTS.DIVERT,
  },
  {
    text: 'Disable DMs',
    key: MOD_EVENTS.DISABLE_DMS,
  },
  {
    text: 'Enable DMs',
    key: MOD_EVENTS.ENABLE_DMS,
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
  hasBlobs,
  isSubjectDid,
}: {
  subjectStatus?: ToolsOzoneModerationDefs.SubjectStatusView | null
  selectedAction: string
  setSelectedAction: (action: string) => void
  hasBlobs: boolean
  isSubjectDid: boolean
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
      if (
        (key === MOD_EVENTS.TAKEDOWN || key === MOD_EVENTS.DIVERT) &&
        subjectStatus?.takendown
      ) {
        return false
      }
      // Don't show divert action if the subject does not have any blobs
      if (key === MOD_EVENTS.DIVERT && !hasBlobs) {
        return false
      }
      // Don't show reverse takedown action if subject is not takendown
      if (key === MOD_EVENTS.REVERSE_TAKEDOWN && !subjectStatus?.takendown) {
        return false
      }
      // Don't show mute action if subject is already muted
      if (key === MOD_EVENTS.MUTE && isSubjectMuted(subjectStatus)) {
        return false
      }
      // Don't show unmute action if subject is not muted
      if (key === MOD_EVENTS.UNMUTE && !isSubjectMuted(subjectStatus)) {
        return false
      }
      // Don't show mute reporter action if reporter is already muted
      if (
        key === MOD_EVENTS.MUTE_REPORTER &&
        (isReporterMuted(subjectStatus) || !isSubjectDid)
      ) {
        return false
      }
      // Don't show unmute reporter action if reporter is not muted
      if (
        key === MOD_EVENTS.UNMUTE_REPORTER &&
        (!isReporterMuted(subjectStatus) || !isSubjectDid)
      ) {
        return false
      }
      // Don't show escalate action if subject is already escalated
      if (
        key === MOD_EVENTS.ESCALATE &&
        subjectStatus?.reviewState === ToolsOzoneModerationDefs.REVIEWESCALATED
      ) {
        return false
      }

      if (
        key === MOD_EVENTS.DISABLE_DMS &&
        (subjectStatus?.tags?.includes(DM_DISABLE_TAG) || !isSubjectDid)
      ) {
        console.log('disable')
        return false
      }
      if (
        key === MOD_EVENTS.ENABLE_DMS &&
        (!subjectStatus?.tags?.includes(DM_DISABLE_TAG) || !isSubjectDid)
      ) {
        console.log('enable')
        return false
      }

      return true
    })
  }, [
    subjectStatus?.takendown,
    subjectStatus?.muteUntil,
    subjectStatus?.muteReportingUntil,
    subjectStatus?.reviewState,
    subjectStatus?.appealed,
    subjectStatus?.tags,
    hasBlobs,
    isSubjectDid,
  ])

  console.log(availableActions, actions)
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
