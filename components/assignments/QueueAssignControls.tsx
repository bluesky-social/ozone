'use client'

import { PlusIcon } from '@heroicons/react/24/outline'
import { ToolsOzoneQueueDefs, ToolsOzoneTeamDefs } from '@atproto/api'
import {
  useLabelerAgent,
  usePermission,
  useServerConfig,
} from '@/shell/ConfigurationContext'
import { useAssignQueue } from './useAssignments'
import { AssigneeSearchPopover } from './AssigneeSearchPopover'

interface QueueAssignControlsProps {
  queueId: number
  assignments: ToolsOzoneQueueDefs.AssignmentView[]
}

// Controls for adding assignees to a queue: a member search popover for
// admins, or a self-assign shortcut for moderators with queue permissions.
export function QueueAssignControls({
  queueId,
  assignments,
}: QueueAssignControlsProps) {
  const canManageQueues = usePermission('canManageQueues')
  const { role } = useServerConfig()
  const isAdmin = role === ToolsOzoneTeamDefs.ROLEADMIN
  const myDid = useLabelerAgent().did

  const { mutate: assignQueue } = useAssignQueue()

  const isAssignedToMe = assignments.some((a) => a.did === myDid)
  const showAssignSelf = !isAdmin && !isAssignedToMe && canManageQueues && myDid

  if (isAdmin) {
    return (
      <AssigneeSearchPopover
        excludeDids={assignments.map((a) => a.did)}
        onSelect={(did) => {
          assignQueue({ did, queueId })
        }}
      />
    )
  }

  if (showAssignSelf) {
    return (
      <button
        type="button"
        onClick={() => assignQueue({ did: myDid, queueId })}
        className="text-xs text-indigo-600 dark:text-teal-400 hover:underline flex items-center gap-1"
      >
        <PlusIcon className="h-4 w-4" />
        Assign to me
      </button>
    )
  }

  return null
}
