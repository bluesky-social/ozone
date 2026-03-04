'use client'

import { useAssignQueue } from './useAssignments'
import { Assignee } from './Assignee'
import { MemberSearchPopover } from './MemberSearchPopover'
import { ToolsOzoneQueueDefs } from '@atproto/api'

interface QueueAssigneeStatusProps {
  queueId: number
  assignments: ToolsOzoneQueueDefs.AssignmentView[]
}

export function QueueAssigneeStatus({
  queueId,
  assignments,
}: QueueAssigneeStatusProps) {
  const { mutate: assignQueue } = useAssignQueue()

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {assignments.map((a) => (
        <Assignee key={a.id} did={a.did} />
      ))}
      <MemberSearchPopover
        onSelect={(did) => {
          assignQueue({ did, queueId })
        }}
      />
    </div>
  )
}
