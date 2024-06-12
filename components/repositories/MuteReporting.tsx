import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { FormLabel, Textarea } from '@/common/forms'
import { ConfirmationModal } from '@/common/modals/confirmation'
import { MOD_EVENTS } from '@/mod-event/constants'
import { ActionDurationSelector } from '@/reports/ModerationForm/ActionDurationSelector'
import { useLabelerAgent } from '@/shell/ConfigurationContext'

const useMuteReporting = ({
  did,
  isReportingMuted,
}: {
  did: string
  isReportingMuted: boolean
}) => {
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()
  const mutation = useMutation<
    { success: boolean },
    unknown,
    | {
        durationInHours: number
        comment?: string
      }
    | { comment?: string },
    unknown
  >(
    async (params) => {
      const result = await labelerAgent.api.tools.ozone.moderation.emitEvent(
        {
          event: {
            $type: isReportingMuted
              ? `tools.ozone.moderation.defs#modEventUnmuteReporter`
              : `tools.ozone.moderation.defs#modEventMuteReporter`,
            ...params,
          },
          subject: {
            $type: 'com.atproto.admin.defs#repoRef',
            did,
          },
          createdBy: labelerAgent.getDid(),
        },
        { encoding: 'application/json' },
      )

      return result
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['accountView', { id: did }],
        })
      },
    },
  )

  return mutation
}

export const MuteReporting = ({
  isOpen,
  setIsOpen,
  did,
  isReportingMuted,
}: {
  did: string
  isOpen: boolean
  isReportingMuted: boolean
  setIsOpen: (isOpen: boolean) => void
}) => {
  const [comment, setComment] = useState('')
  const [durationInHours, setDurationInHours] = useState<undefined | number>(
    undefined,
  )
  const toggleReportingMute = useMuteReporting({ did, isReportingMuted })
  const confirmButtonText = toggleReportingMute.isLoading
    ? 'Loading...'
    : isReportingMuted
    ? 'Yes, Unmute'
    : 'Yes, Mute'
  return (
    <ConfirmationModal
      onConfirm={() => {
        if (!durationInHours && !isReportingMuted) return
        toggleReportingMute
          .mutateAsync(
            isReportingMuted
              ? { comment }
              : {
                  comment,
                  durationInHours,
                },
          )
          .then(() => {
            setIsOpen(false)
            setComment('')
            setDurationInHours(undefined)
          })
      }}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      confirmButtonText={confirmButtonText}
      confirmButtonDisabled={toggleReportingMute.isLoading}
      error={
        toggleReportingMute.isError && toggleReportingMute.error?.['message}']
      }
      title={`${
        isReportingMuted ? 'Unmute' : 'Mute'
      } reports from this account?`}
      description={
        <>
          While reporting is muted, all reports from this account will still be
          logged and displayed in the event log but the review state of the
          subject being reported by this user {"won't"} be changed.
        </>
      }
    >
      {!isReportingMuted && (
        <FormLabel label="" htmlFor="durationInHours" className={`mt-2`}>
          <ActionDurationSelector
            action={MOD_EVENTS.MUTE}
            onChange={(e) => setDurationInHours(Number(e.target.value))}
            value={durationInHours}
            labelText={'Mute duration'}
          />
        </FormLabel>
      )}
      <Textarea
        autoFocus
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        name="comment"
        className="w-full mt-4"
        placeholder={`Additional comment for the action...`}
      />
    </ConfirmationModal>
  )
}
