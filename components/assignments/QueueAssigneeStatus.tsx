'use client'

import { Assignee } from './Assignee'
import { MemberSearchPopover } from './MemberSearchPopover'
import {
  useAssignQueue,
  useQueueAssignments,
} from '../../lib/assignments/useAssignmentsRealtime'

interface QueueAssigneeStatusProps {
  queueId: number
}

export function QueueAssigneeStatus({ queueId }: QueueAssigneeStatusProps) {
  const { data: assignments = [] } = useQueueAssignments({
    onlyActiveAssignments: true,
    queueIds: [queueId],
  })
  const { mutate: assignQueue } = useAssignQueue()

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {assignments.map((a) => (
        <Assignee key={a.id} did={a.did} />
      ))}
      <MemberSearchPopover
        onSelect={(did) => {
          assignQueue({ did, queueId, assign: true })
        }}
      />
    </div>
  )
}
