'use client'

import { useState } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'
import { ToolsOzoneQueueDefs, ToolsOzoneTeamDefs } from '@atproto/api'
import { formatDistanceToNowStrict } from 'date-fns'
import { toast } from 'react-toastify'
import {
  useLabelerAgent,
  usePermission,
  useServerConfig,
} from '@/shell/ConfigurationContext'
import { displayError } from '@/common/Loader'
import { ConfirmationModal } from '@/common/modals/confirmation'
import { useAssignQueue, useUnassignQueue } from './useAssignments'
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
  const { role } = useServerConfig()
  const isAdmin = role === ToolsOzoneTeamDefs.ROLEADMIN
  const myDid = useLabelerAgent().did

  const { mutate: assignQueue } = useAssignQueue()
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

  const isAssignedToMe = assignments.some((a) => a.did === myDid)
  const showAssignSelf =
    !isAdmin && !isAssignedToMe && canManageQueues && myDid
  const showEmptyIndicator =
    assignments.length === 0 && !isAdmin && !showAssignSelf

  const assignedDids = assignments.map((a) => a.did)

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
      {assignments.map((a) =>
        isAdmin ? (
          <button
            key={a.id}
            type="button"
            onClick={() => handleAssigneeClick(a)}
            className="rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-teal-400"
            title="Unassign moderator"
          >
            <Assignee did={a.did} />
          </button>
        ) : (
          <Assignee key={a.id} did={a.did} />
        ),
      )}
      {isAdmin && (
        <AssigneeSearchPopover
          excludeDids={assignedDids}
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
