'use client'

import { useState } from 'react'
import { useQueueAssignments, useAssignQueue } from './useAssignments'
import { QueueAssignee } from './QueueAssignee'
import { MemberSearchPopover } from './MemberSearchPopover'

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
        <QueueAssignee key={a.id} did={a.did} />
      ))}
      <MemberSearchPopover
        onSelect={(did) => {
          assignQueue({ did, queueId, assign: true })
        }}
      />
    </div>
  )
}
