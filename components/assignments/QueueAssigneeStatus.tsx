'use client'

import { useState } from 'react'
import { ToolsOzoneQueueDefs, ToolsOzoneTeamDefs } from '@atproto/api'
import { formatDistanceToNowStrict } from 'date-fns'
import { toast } from 'react-toastify'
import { useServerConfig } from '@/shell/ConfigurationContext'
import { displayError } from '@/common/Loader'
import { ConfirmationModal } from '@/common/modals/confirmation'
import { ModeratorBadge } from '@/common/profileStatus/ModeratorBadge'
import { useUnassignQueue } from './useAssignments'

interface QueueAssigneeStatusProps {
  queueId: number
  assignments: ToolsOzoneQueueDefs.AssignmentView[]
}

export function QueueAssigneeStatus({
  queueId,
  assignments,
}: QueueAssigneeStatusProps) {
  const { role } = useServerConfig()
  const isAdmin = role === ToolsOzoneTeamDefs.ROLEADMIN

  const [pendingUnassign, setPendingUnassign] =
    useState<ToolsOzoneQueueDefs.AssignmentView | null>(null)
  const [unassignError, setUnassignError] = useState<string | undefined>()

  const pendingLabel = pendingUnassign
    ? pendingUnassign.moderator?.profile?.displayName ||
      pendingUnassign.moderator?.profile?.handle ||
      pendingUnassign.did
    : ''

  const { mutate: unassignQueue, isLoading: isUnassigning } = useUnassignQueue({
    onSuccess: () => {
      toast.success(
        `${pendingLabel || 'Moderator'} was unassigned from this queue`,
      )
      setPendingUnassign(null)
      setUnassignError(undefined)
    },
    onError: (err) => {
      setUnassignError(displayError(err))
    },
  })

  const handleAssigneeClick = (a: ToolsOzoneQueueDefs.AssignmentView) => {
    setUnassignError(undefined)
    setPendingUnassign(a)
  }

  const handleConfirmUnassign = () => {
    if (!pendingUnassign) return
    setUnassignError(undefined)
    unassignQueue({ queueId, did: pendingUnassign.did })
  }

  const handleCloseModal = (open: boolean) => {
    if (open) return
    if (isUnassigning) return
    setPendingUnassign(null)
    setUnassignError(undefined)
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {assignments.map((a) => (
        <ModeratorBadge
          key={a.id}
          did={a.did}
          profile={a.moderator?.profile}
          onRemove={isAdmin ? () => handleAssigneeClick(a) : undefined}
        />
      ))}
      {assignments.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500">-</p>
      )}

      <ConfirmationModal
        isOpen={!!pendingUnassign}
        setIsOpen={handleCloseModal}
        title="Unassign moderator"
        description={
          pendingUnassign ? (
            <>
              Are you sure you want to unassign{' '}
              <strong className="font-semibold text-gray-900 dark:text-gray-50">
                {pendingLabel}
              </strong>{' '}
              from{' '}
              <strong className="font-semibold text-gray-900 dark:text-gray-50">
                {pendingUnassign.queue.name}
              </strong>
              ? They have been assigned for{' '}
              {formatDistanceToNowStrict(new Date(pendingUnassign.startAt))}.
            </>
          ) : undefined
        }
        confirmButtonText={isUnassigning ? 'Unassigning…' : 'Unassign'}
        confirmButtonDisabled={isUnassigning}
        onConfirm={handleConfirmUnassign}
        error={unassignError}
      />
    </div>
  )
}
