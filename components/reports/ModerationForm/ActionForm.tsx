'use client'
import { useState, useRef, FormEvent } from 'react'
import { ToolsOzoneModerationEmitEvent } from '@atproto/api'
import { ButtonPrimary, ButtonSecondary } from '@/common/buttons'
import { Checkbox, Textarea } from '@/common/forms'
import { LabelSelector } from '@/common/labels/Selector'
import { isSelfLabel } from '@/common/labels/util'
import { ActionDurationSelector } from '@/reports/ModerationForm/ActionDurationSelector'
import { PolicySeveritySelector } from 'app/actions/ModActionPanel/PolicySeveritySelector'
import { ActionError } from '@/reports/ModerationForm/ActionError'
import { MOD_EVENTS } from '@/mod-event/constants'

type ActionType = 'label' | 'takedown'

interface ActionFormProps {
  actionType: ActionType | null
  onSubmit: (vals: ToolsOzoneModerationEmitEvent.InputSchema) => Promise<void>
  onCancel: () => void
  formId: string
  // Label-specific props
  currentLabels?: string[]
  allLabels?: any[]
  configDid?: string
  // Takedown-specific props
  policyDetails?: any
  handlePolicySelect?: (policy: string) => void
  handleSeverityLevelSelect?: (level: string) => void
  severityLevelStrikeCount?: number
  currentStrikes?: number
  actionRecommendation?: any
  selectedPolicyName?: string
  selectedSeverityLevelName?: string
  targetServices?: string[]
  setTargetServices?: (services: string[]) => void
  isSubjectDid?: boolean
  // Common props
  isReviewClosed?: boolean
  isEscalated?: boolean
  submissionError?: Error | null
  isSubmitting?: boolean
}

export function ActionForm({
  actionType,
  onSubmit,
  onCancel,
  formId,
  currentLabels = [],
  allLabels = [],
  configDid,
  policyDetails,
  handlePolicySelect,
  handleSeverityLevelSelect,
  severityLevelStrikeCount,
  currentStrikes,
  actionRecommendation,
  selectedPolicyName,
  selectedSeverityLevelName,
  targetServices = [],
  setTargetServices,
  isSubjectDid = false,
  isReviewClosed = false,
  isEscalated = false,
  submissionError,
  isSubmitting = false,
}: ActionFormProps) {
  const durationSelectorRef = useRef<HTMLSelectElement>(null)

  if (!actionType) return null

  const isLabelAction = actionType === 'label'
  const isTakedownAction = actionType === 'takedown'

  const handleFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const eventType = isLabelAction ? MOD_EVENTS.LABEL : MOD_EVENTS.TAKEDOWN
    const event: any = { $type: eventType }

    // Handle labels
    if (isLabelAction) {
      const labelsInput = formData.get('labels')
      if (labelsInput) {
        event.createLabelVals = (labelsInput as string).split(',').filter(Boolean)
        event.negateLabelVals = []
      }
    }

    // Handle duration
    const durationInHours = formData.get('durationInHours')
    if (durationInHours) {
      const hours = parseInt(durationInHours as string, 10)
      if (hours > 0) {
        event.durationInHours = hours
      }
    }

    // Handle comment
    const comment = formData.get('comment')
    if (comment) {
      event.comment = comment
    }

    // Handle takedown-specific fields
    if (isTakedownAction) {
      const policy = formData.get('policy')
      const severityLevel = formData.get('severityLevel')
      if (policy) event.policy = policy
      if (severityLevel) event.severityLevel = severityLevel
      if (targetServices && targetServices.length > 0) {
        event.targetServices = targetServices
      }
    }

    // Handle acknowledge checkbox
    const additionalAcknowledgeEvent = formData.get('additionalAcknowledgeEvent')
    const acknowledgeAccountSubjects = formData.get('acknowledgeAccountSubjects')

    const vals: ToolsOzoneModerationEmitEvent.InputSchema = {
      event,
      subject: { $type: 'com.atproto.admin.defs#repoRef', did: '' }, // Will be filled by parent
      createdBy: '', // Will be filled by parent
    }

    // Add additional events if checkboxes are checked
    if (additionalAcknowledgeEvent === 'true' || acknowledgeAccountSubjects === 'true') {
      // Parent component will handle this based on form data
    }

    await onSubmit(vals)
  }

  return (
    <form id={formId} onSubmit={handleFormSubmit} className="space-y-3">
      {isTakedownAction && handlePolicySelect && handleSeverityLevelSelect && setTargetServices && (
        <PolicySeveritySelector
          defaultPolicy={selectedPolicyName}
          policyDetails={policyDetails}
          handlePolicySelect={handlePolicySelect}
          handleSeverityLevelSelect={handleSeverityLevelSelect}
          severityLevelStrikeCount={severityLevelStrikeCount ?? null}
          defaultSeverityLevel={selectedSeverityLevelName}
          currentStrikes={currentStrikes}
          actionRecommendation={actionRecommendation}
          variant="takedown"
          targetServices={targetServices as any}
          setTargetServices={setTargetServices as any}
          isSubjectDid={isSubjectDid}
        />
      )}

      <div className="flex flex-row gap-2">
        <div className="mb-1 mt-2 flex-1">
          <ActionDurationSelector
            ref={durationSelectorRef}
            action={isLabelAction ? MOD_EVENTS.LABEL : MOD_EVENTS.TAKEDOWN}
            required={!isLabelAction}
            showPermanent={true}
            defaultValue={0}
            onChange={(e) => {
              if (e.target.value === '0' && isTakedownAction) {
                const ackAllCheckbox = document.querySelector<HTMLInputElement>(
                  'input[name="acknowledgeAccountSubjects"]',
                )
                if (ackAllCheckbox && !ackAllCheckbox.checked) {
                  ackAllCheckbox.checked = true
                }
              }
            }}
            labelText={
              isLabelAction ? 'Label duration' : ''
            }
          />
        </div>
      </div>

      {isLabelAction && (
        <div className="mt-2">
          <LabelSelector
            id="labels"
            name="labels"
            form={formId}
            defaultLabels={currentLabels.filter((label) => {
              const isEditableLabel = allLabels.some(
                (l) => l.val === label && l.src === configDid,
              )
              return !isSelfLabel(label) && isEditableLabel
            })}
          />
        </div>
      )}

      <div className="mt-2">
        <Textarea
          name="comment"
          placeholder="Reason for action (optional)"
          className="block w-full mb-3"
        />
      </div>

      {isLabelAction && !isReviewClosed && (
        <Checkbox
          value="true"
          defaultChecked
          id="additionalAcknowledgeEvent"
          name="additionalAcknowledgeEvent"
          className="mb-3 flex items-center leading-3"
          label={
            <span className="leading-4">
              {isEscalated
                ? `De-escalate the subject and acknowledge all open reports after this action`
                : `Acknowledge all open reports after this action`}
            </span>
          }
        />
      )}

      {isTakedownAction && isSubjectDid && (
        <Checkbox
          value="true"
          id="acknowledgeAccountSubjects"
          name="acknowledgeAccountSubjects"
          className="mb-3 flex items-center leading-3"
          label={
            <span className="leading-4">
              Acknowledge all open/escalated/appealed reports on subjects
              created by this user
            </span>
          }
        />
      )}

      {submissionError && (
        <div className="my-2">
          <ActionError error={submissionError.message} />
        </div>
      )}

      <div className="mt-4 flex flex-row justify-between">
        <ButtonSecondary
          className="px-4"
          disabled={isSubmitting}
          onClick={onCancel}
        >
          Cancel
        </ButtonSecondary>
        <ButtonPrimary
          type="submit"
          disabled={isSubmitting}
          className="px-4"
        >
          Submit
        </ButtonPrimary>
      </div>
    </form>
  )
}
