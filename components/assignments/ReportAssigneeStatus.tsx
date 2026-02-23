'use client'

import { useState } from 'react'
import { useAssignments, useClaimReport } from './useAssignments'
import { ReportAssignee } from './ReportAssignee'
import { MemberSearchPopover } from './MemberSearchPopover'

interface ReportAssigneeStatusProps {
  reportId: number
}

export function ReportAssigneeStatus({ reportId }: ReportAssigneeStatusProps) {
  const [isHovered, setIsHovered] = useState(false)
  const { data: assignments = [] } = useAssignments({
    onlyActiveAssignments: true,
  })
  const { mutate: claimReport } = useClaimReport()

  const reportAssignment = assignments.find((a) => a.reportId === reportId)

  const handleAdd = (_did: string) => {
    // claimReport always assigns to the authenticated user (server-side),
    // so the did param from member search is informational only
    claimReport({ reportId, assign: true })
  }

  const handleRemove = () => {
    claimReport({ reportId, assign: false })
  }

  return (
    <div
      className="flex items-center gap-2 flex-wrap"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {reportAssignment ? (
        <>
          <ReportAssignee
            did={reportAssignment.did}
            onRemove={handleRemove}
          />
          {isHovered && <MemberSearchPopover onSelect={handleAdd} />}
        </>
      ) : (
        <MemberSearchPopover onSelect={handleAdd} />
      )}
    </div>
  )
}
