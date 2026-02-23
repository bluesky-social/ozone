'use client'

import { useState } from 'react'
import { useAssignments, useAssignQueue } from './useAssignments'
import { QueueAssignee } from './QueueAssignee'
import { MemberSearchPopover } from './MemberSearchPopover'

interface QueueAssigneeStatusProps {
  queueId: number
}

export function QueueAssigneeStatus({ queueId }: QueueAssigneeStatusProps) {
  const [isHovered, setIsHovered] = useState(false)
  const { data: assignments = [] } = useAssignments({
    onlyActiveAssignments: true,
    queueIds: [queueId],
  })
  const { mutate: assignQueue } = useAssignQueue()

  const queueAssignments = assignments.filter((a) => !a.reportId)

  const handleAdd = (did: string) => {
    assignQueue({ did, queueId, assign: true })
  }

  return (
    <div
      className="flex items-center gap-2 flex-wrap"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {queueAssignments.map((a) => (
        <QueueAssignee
          key={a.id}
          did={a.did}
          onRemove={() => {
            assignQueue({ did: a.did, queueId, assign: false })
          }}
        />
      ))}
      {(queueAssignments.length === 0 || isHovered) && (
        <MemberSearchPopover onSelect={handleAdd} />
      )}
    </div>
  )
}
