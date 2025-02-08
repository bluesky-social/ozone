import { useMemo } from 'react'
import { ToolsOzoneModerationDefs } from '@atproto/api'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import { Dropdown } from '@/common/Dropdown'
import { MOD_EVENTS } from './constants'
import { isReporterMuted, isSubjectMuted } from '@/subject/helpers'
import { DM_DISABLE_TAG, VIDEO_UPLOAD_DISABLE_TAG } from '@/lib/constants'
import { usePermission } from '@/shell/ConfigurationContext'

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
    key: MOD_EVENTS.APPEAL,
  },
  {
    text: 'Resolve Appeal',
    key: MOD_EVENTS.RESOLVE_APPEAL,
  },
  {
    text: 'Send Email',
    key: MOD_EVENTS.EMAIL,
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
  {
    text: 'Disable Video Upload',
    key: MOD_EVENTS.DISABLE_VIDEO_UPLOAD,
  },
  {
    text: 'Enable Video Upload',
    key: MOD_EVENTS.ENABLE_VIDEO_UPLOAD,
  },
  {
    text: 'Set Priority Score',
    key: MOD_EVENTS.SET_PRIORITY,
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
  forceDisplayActions = [],
}: {
  subjectStatus?: ToolsOzoneModerationDefs.SubjectStatusView | null
  selectedAction: string
  setSelectedAction: (action: string) => void
  hasBlobs: boolean
  isSubjectDid: boolean
  forceDisplayActions?: string[]
}) => {
  const canDivertBlob = usePermission('canDivertBlob')
  const canTakedown = usePermission('canTakedown')
  const canManageChat = usePermission('canManageChat')
  const canSendEmail = usePermission('canSendEmail')

  const availableActions = useMemo(() => {
    return actions.filter(({ key }) => {
      // Don't show resolve appeal action if subject is not already in appealed status
      if (
        key === MOD_EVENTS.RESOLVE_APPEAL &&
        !subjectStatus?.appealed &&
        !forceDisplayActions.includes(MOD_EVENTS.RESOLVE_APPEAL)
      ) {
        return false
      }
      // Don't show appeal action if subject is already in appealed status
      if (key === MOD_EVENTS.APPEAL && subjectStatus?.appealed) {
        return false
      }
      // Don't show email if user does not have permission to send email
      // or if the subject is not a DID but override that if it is set to be force displayed
      if (
        key === MOD_EVENTS.EMAIL &&
        (!canSendEmail ||
          (!isSubjectDid && !forceDisplayActions.includes(MOD_EVENTS.EMAIL)))
      ) {
        return false
      }
      // Don't show takedown action if subject is already takendown
      if (
        (key === MOD_EVENTS.TAKEDOWN || key === MOD_EVENTS.DIVERT) &&
        (subjectStatus?.takendown || !canTakedown)
      ) {
        return false
      }
      // Don't show divert action if the subject does not have any blobs
      if (key === MOD_EVENTS.DIVERT && (!hasBlobs || !canDivertBlob)) {
        return false
      }
      // Don't show reverse takedown action if subject is not takendown
      if (
        key === MOD_EVENTS.REVERSE_TAKEDOWN &&
        // show reverse action even when subjectStatus is not takendown if we want to force display it
        // however, if the user doesn't have permission for takedowns, don't show it
        ((!subjectStatus?.takendown &&
          !forceDisplayActions.includes(MOD_EVENTS.RESOLVE_APPEAL)) ||
          !canTakedown)
      ) {
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
        (subjectStatus?.tags?.includes(DM_DISABLE_TAG) ||
          !isSubjectDid ||
          !canManageChat)
      ) {
        return false
      }
      if (
        key === MOD_EVENTS.ENABLE_DMS &&
        (!subjectStatus?.tags?.includes(DM_DISABLE_TAG) ||
          !isSubjectDid ||
          !canManageChat)
      ) {
        return false
      }

      // Checking canManageChat is not ideal but for now, only bsky mod service has control on both
      // so it makes sense to rely on that one check for both actions
      if (
        key === MOD_EVENTS.DISABLE_VIDEO_UPLOAD &&
        (subjectStatus?.tags?.includes(VIDEO_UPLOAD_DISABLE_TAG) ||
          !isSubjectDid ||
          !canManageChat)
      ) {
        return false
      }
      if (
        key === MOD_EVENTS.ENABLE_VIDEO_UPLOAD &&
        (!subjectStatus?.tags?.includes(VIDEO_UPLOAD_DISABLE_TAG) ||
          !isSubjectDid ||
          !canManageChat)
      ) {
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
    canManageChat,
    canTakedown,
    canDivertBlob,
    forceDisplayActions,
  ])

  return (
    <Dropdown
      className="inline-flex justify-center rounded-md border border-gray-300 dark:border-teal-500 bg-white dark:bg-slate-800 dark:text-gray-100 dark:focus:border-teal-500  dark px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700"
      items={availableActions.map(({ key, text }) => ({
        text,
        onClick: () => setSelectedAction(key),
      }))}
      data-cy="mod-event-selector"
    >
      {actionsByKey[selectedAction] || 'Action'}

      <ChevronDownIcon
        className="ml-2 -mr-1 h-5 w-5 text-violet-200 hover:text-violet-100"
        aria-hidden="true"
      />
    </Dropdown>
  )
}
