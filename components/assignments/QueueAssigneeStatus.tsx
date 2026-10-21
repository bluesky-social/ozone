'use client'

import { useState } from 'react'
import { ToolsOzoneQueueDefs, ToolsOzoneTeamDefs } from '@atproto/api'
import { formatDistanceToNowStrict } from 'date-fns'
import { toast } from 'react-toastify'
import { useLabelerAgent, useServerConfig } from '@/shell/ConfigurationContext'
import { displayError } from '@/common/Loader'
import { ConfirmationModal } from '@/common/modals/confirmation'
import { ModeratorBadge } from '@/common/profileStatus/ModeratorBadge'
import { useUnassignQueue } from './useAssignments'

interface QueueAssigneeStatusProps {
  queueId: number
  strictAccess?: boolean
  assignments: ToolsOzoneQueueDefs.AssignmentView[]
}

export function QueueAssigneeStatus({
  queueId,
  strictAccess = false,
  assignments,
}: QueueAssigneeStatusProps) {
  const { role } = useServerConfig()
  const isAdmin = role === ToolsOzoneTeamDefs.ROLEADMIN
  const myDid = useLabelerAgent().did

  const [pendingUnassign, setPendingUnassign] =
    useState<ToolsOzoneQueueDefs.AssignmentView | null>(null)
  const [unassignError, setUnassignError] = useState<string | undefined>()

  const pendingLabel = pendingUnassign
    ? pendingUnassign.moderator?.profile?.displayName ||
      pendingUnassign.moderator?.profile?.handle ||
      pendingUnassign.did
    : ''
  const isLeaving = pendingUnassign?.did === myDid && !isAdmin

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
          onRemove={
            isAdmin || a.did === myDid
              ? () => handleAssigneeClick(a)
              : undefined
          }
        />
      ))}
      {assignments.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500">-</p>
      )}

      <ConfirmationModal
        isOpen={!!pendingUnassign}
        setIsOpen={handleCloseModal}
        title={isLeaving ? 'Leave queue' : 'Unassign moderator'}
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
              {strictAccess && isLeaving ? (
                <p className="mt-2">
                  Leaving removes your access to this queue and its individual
                  reports. An admin must assign you again to restore access.
                </p>
              ) : (
                strictAccess && (
                  <p className="mt-2">
                    Removing this assignment removes their access to this queue
                    and its individual reports unless they are an admin. An
                    admin must add them again to restore access.
                  </p>
                )
              )}
            </>
          ) : undefined
        }
        confirmButtonText={
          isUnassigning
            ? 'Unassigning…'
            : isLeaving
              ? 'Leave queue'
              : 'Unassign'
        }
        confirmButtonDisabled={isUnassigning}
        onConfirm={handleConfirmUnassign}
        error={unassignError}
      />
    </div>
  )
}
