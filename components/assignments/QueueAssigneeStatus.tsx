'use client'

import type { AssignmentView } from './useAssignments'
import { useAssignQueue } from './useAssignments'
import { Assignee } from './Assignee'
import { MemberSearchPopover } from './MemberSearchPopover'

interface QueueAssigneeStatusProps {
  queueId: number
  assignments: AssignmentView[]
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
