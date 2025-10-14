import { ActionButton } from '@/common/buttons'
import { Checkbox, FormLabel, Input, Textarea } from '@/common/forms'
import { MOD_EVENTS } from '@/mod-event/constants'
import { LabelSelector } from '@/common/labels/Selector'
import { ActionDurationSelector } from '@/reports/ModerationForm/ActionDurationSelector'
import { ModEventSelectorButton } from '@/mod-event/SelectorButton'
import { ModEventDetailsPopover } from '@/mod-event/DetailsPopover'
import { WORKSPACE_FORM_ID } from './constants'
import { EmailComposer } from 'components/email/Composer'
import { EmailComposerData } from 'components/email/helpers'
import { ActionPolicySelector } from '@/reports/ModerationForm/ActionPolicySelector'
import { getBatchId, regenerateBatchId } from '@/lib/batchId'
import { useState } from 'react'
import { toast } from 'react-toastify'
import { ModToolForm } from './ModToolForm'
import { TakedownScheduleSelector } from '@/reports/ModerationForm/TakedownScheduleSelector'

export const WorkspacePanelActionForm = ({
  handleEmailSubmit,
  modEventType,
  setModEventType,
  onCancel,
}: {
  handleEmailSubmit: (emailData: EmailComposerData) => Promise<void>
  modEventType: string
  setModEventType: (action: string) => void
  onCancel: () => void
}) => {
  const [currentBatchId, setCurrentBatchId] = useState(getBatchId())

  const handleRegenerateBatchId = () => {
    const newBatchId = regenerateBatchId()
    setCurrentBatchId(newBatchId)
    toast.success('Workspace Batch ID updated')
  }
  const isAckEvent = modEventType === MOD_EVENTS.ACKNOWLEDGE
  const isEmailEvent = modEventType === MOD_EVENTS.EMAIL
  const isTakedownEvent = modEventType === MOD_EVENTS.TAKEDOWN
  const isPriorityScoreEvent = modEventType === MOD_EVENTS.SET_PRIORITY
  const isCommentEvent = modEventType === MOD_EVENTS.COMMENT
  const isMuteEvent = modEventType === MOD_EVENTS.MUTE
  const isTagEvent = modEventType === MOD_EVENTS.TAG
  const isLabelEvent = modEventType === MOD_EVENTS.LABEL
  const shouldShowDurationInHoursField = isMuteEvent || isLabelEvent

  return (
    <div className="mb-4 w-1/2">
      <div className="relative flex flex-row gap-1 items-center">
        <ModEventSelectorButton
          selectedAction={modEventType}
          isSubjectDid={false}
          hasBlobs={false}
          forceDisplayActions={[
            MOD_EVENTS.EMAIL,
            MOD_EVENTS.RESOLVE_APPEAL,
            MOD_EVENTS.REVERSE_TAKEDOWN,
          ]}
          setSelectedAction={(action) => setModEventType(action)}
        />
        <ModEventDetailsPopover modEventType={modEventType} />
      </div>

      {isEmailEvent ? (
        <div className="mt-2">
          <EmailComposer
            replacePlaceholders={false}
            handleSubmit={handleEmailSubmit}
          />
        </div>
      ) : (
        <div>
          {isPriorityScoreEvent && (
            <FormLabel label="" className="mt-2 w-1/2" htmlFor="priorityScore">
              <Input
                type="number"
                form={WORKSPACE_FORM_ID}
                id="priorityScore"
                name="priorityScore"
                className="block w-full"
                placeholder="Score between 0-100"
                autoFocus
                min={0}
                max={100}
                step={1}
                required
              />
            </FormLabel>
          )}
          {shouldShowDurationInHoursField && (
            <div className="flex flex-row gap-2">
              <FormLabel
                label=""
                htmlFor="durationInHours"
                className={`mb-3 mt-2`}
              >
                <ActionDurationSelector
                  action={modEventType}
                  showPermanent
                  form={WORKSPACE_FORM_ID}
                  labelText={
                    isMuteEvent
                      ? 'Mute duration'
                      : isLabelEvent
                      ? 'Label duration'
                      : ''
                  }
                />
              </FormLabel>
            </div>
          )}

          {isTakedownEvent && (
            <div className="mt-3">
              <div className="w-full">
                <ActionPolicySelector name="policies" />
              </div>
              <div className="mt-2 flex flex-row gap-2">
                <TakedownScheduleSelector form={WORKSPACE_FORM_ID} />
              </div>
            </div>
          )}

          {isLabelEvent && (
            <div className="mt-2">
              <LabelSelector
                id="labels"
                name="labels"
                form={WORKSPACE_FORM_ID}
                defaultLabels={[]}
              />

              <Checkbox
                value="true"
                id="removeLabels"
                name="removeLabels"
                form={WORKSPACE_FORM_ID}
                className="my-3 flex items-center"
                label="Remove selected labels from the subjects"
              />
            </div>
          )}

          {isTagEvent && (
            <FormLabel label="Tags" className="mt-2">
              <Input
                type="text"
                id="tags"
                name="tags"
                className="block w-full"
                placeholder="Comma separated tags"
                defaultValue=""
                form={WORKSPACE_FORM_ID}
              />

              <Checkbox
                value="true"
                id="removeTags"
                name="removeTags"
                className="my-3 flex items-center"
                form={WORKSPACE_FORM_ID}
                label="Remove selected tags from the subjects"
              />
            </FormLabel>
          )}

          <div className="mt-2">
            <Textarea
              name="comment"
              form={WORKSPACE_FORM_ID}
              placeholder="Reason for action (optional)"
              className="block w-full mb-3"
              autoFocus
            />
          </div>
          {isCommentEvent && (
            <Checkbox
              value="true"
              id="sticky"
              name="sticky"
              form={WORKSPACE_FORM_ID}
              className="mb-3 flex items-center"
              label="Update the subject's persistent note with this comment"
            />
          )}
          {(isTakedownEvent || isAckEvent) && (
            <Checkbox
              value="true"
              id="acknowledgeAccountSubjects"
              name="acknowledgeAccountSubjects"
              className="mb-3 flex items-start leading-3"
              inputClassName="mt-1"
              form={WORKSPACE_FORM_ID}
              label={
                <span className="leading-4">
                  Acknowledge all open/escalated/appealed reports on subjects
                  created by accounts that you are{' '}
                  {isAckEvent ? 'acknowledging' : 'taking down'}.
                </span>
              }
            />
          )}

          <ModToolForm
            currentBatchId={currentBatchId}
            handleRegenerateBatchId={handleRegenerateBatchId}
          />

          <div className="flex flex-row gap-2">
            <ActionButton
              appearance="primary"
              type="submit"
              size="sm"
              form={WORKSPACE_FORM_ID}
            >
              Submit Action
            </ActionButton>
            <ActionButton
              appearance="outlined"
              type="button"
              size="sm"
              onClick={onCancel}
            >
              Cancel
            </ActionButton>
          </div>
        </div>
      )}
    </div>
  )
}
