'use client'

import { PlusIcon } from '@heroicons/react/24/outline'
import { ToolsOzoneQueueDefs } from '@atproto/api'
import { useLabelerAgent, usePermission } from '@/shell/ConfigurationContext'
import { useAssignQueue } from './useAssignments'
import { Assignee } from './Assignee'
import { AssigneeSearchPopover } from './AssigneeSearchPopover'

interface QueueAssigneeStatusProps {
  queueId: number
  assignments: ToolsOzoneQueueDefs.AssignmentView[]
}

export function QueueAssigneeStatus({
  queueId,
  assignments,
}: QueueAssigneeStatusProps) {
  const canManageQueues = usePermission('canManageQueues')
  const showAssignOthers = usePermission('canAssignOthers')
  const myDid = useLabelerAgent().did

  const { mutate: assignQueue } = useAssignQueue()

  const isAssignedToMe = assignments.some((a) => a.did === myDid)
  const showAssignSelf =
    !showAssignOthers && !isAssignedToMe && canManageQueues && myDid
  const showEmptyIndicator =
    assignments.length === 0 && !showAssignOthers && !showAssignSelf

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {assignments.map((a) => (
        <Assignee key={a.id} did={a.did} />
      ))}
      {showAssignOthers && (
        <AssigneeSearchPopover
          onSelect={(did) => {
            assignQueue({ did, queueId })
          }}
        />
      )}
      {showAssignSelf && (
        <button
          type="button"
          onClick={() => assignQueue({ did: myDid, queueId })}
          className="text-xs text-indigo-600 dark:text-teal-400 hover:underline flex items-center gap-1"
        >
          <PlusIcon className="h-4 w-4" />
          Assign to me
        </button>
      )}
      {showEmptyIndicator && (
        <p className="text-xs text-gray-400 dark:text-gray-500">-</p>
      )}
    </div>
  )
}
