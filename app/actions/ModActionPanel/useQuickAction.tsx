import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  $Typed,
  AtUri,
  ToolsOzoneModerationDefs,
  ToolsOzoneModerationEmitEvent,
} from '@atproto/api'
import { FormEvent, useEffect, useRef, useState } from 'react'
import {
  diffLabels,
  getLabelsForSubject,
  toLabelVal,
  isSelfLabel,
} from '@/common/labels/util'
import { useKeyPressEvent } from 'react-use'
import { takesKeyboardEvt } from '@/lib/util'
import { MOD_EVENTS } from '@/mod-event/constants'
import { useCreateSubjectFromId } from '@/reports/helpers/subject'
import {
  useConfigurationContext,
  useLabelerAgent,
  usePermission,
} from '@/shell/ConfigurationContext'
import { getEventFromFormData } from '@/mod-event/helpers/emitEvent'
import { usePolicyListSetting } from '@/setting/policy/usePolicyList'
import { useSeverityLevelSetting } from '@/setting/severity-level/useSeverityLevel'
import { useActionRecommendation } from '@/mod-event/helpers/useActionRecommendation'
import { nameToKey } from '@/setting/policy/utils'

export type QuickActionProps = {
  subject: string
  setSubject: (subject: string) => void
  subjectOptions?: string[]
  onSubmit: (vals: ToolsOzoneModerationEmitEvent.InputSchema) => Promise<void>
}

export const useQuickAction = (
  props: QuickActionProps & {
    onCancel: () => void
  },
) => {
  const { config } = useConfigurationContext()
  const queryClient = useQueryClient()
  const labelerAgent = useLabelerAgent()
  const accountDid = labelerAgent.assertDid

  const { subject, setSubject, subjectOptions, onCancel, onSubmit } = props
  const [submission, setSubmission] = useState<{
    isSubmitting: boolean
    error: string
  }>({ isSubmitting: false, error: '' })

  const { data: subjectStatus, refetch: refetchSubjectStatus } =
    useSubjectStatusQuery(subject)

  const { data: { record, repo, profile } = {}, refetch: refetchSubject } =
    useSubjectQuery(subject)

  const isSubjectDid = subject.startsWith('did:')
  const isReviewClosed =
    subjectStatus?.reviewState === ToolsOzoneModerationDefs.REVIEWCLOSED
  const isEscalated =
    subjectStatus?.reviewState === ToolsOzoneModerationDefs.REVIEWESCALATED
  const isAppealed = !!subjectStatus?.appealed

  const allLabels = getLabelsForSubject({ repo, record })
  const currentLabels = allLabels.map((label) =>
    toLabelVal(label, repo?.did ?? record?.repo.did),
  )
  const [modEventType, setModEventType] = useState<string>(
    MOD_EVENTS.ACKNOWLEDGE,
  )
  // Track only the details needed for UI rendering
  const [policyDetails, setPolicyDetails] = useState<{
    severityLevels?: Record<string, { description: string; isDefault: boolean }>
  } | null>(null)
  const [severityLevelStrikeCount, setSeverityLevelStrikeCount] = useState<
    number | null
  >(null)
  const [selectedPolicyName, setSelectedPolicyName] = useState<string>('')
  const [selectedSeverityLevelName, setSelectedSeverityLevelName] =
    useState<string>('')

  const { data: policyData } = usePolicyListSetting()
  const { data: severityLevelData } = useSeverityLevelSetting(labelerAgent)
  const {
    strikeData,
    strikeDataError,
    currentStrikes,
    getRecommendedAction,
    getLastContentTakedownDetails,
  } = useActionRecommendation(labelerAgent, subject, severityLevelData?.value)

  // Reusable handler for policy selection
  const handlePolicySelect = (policyName: string) => {
    const policyKey = nameToKey(policyName)
    const policy = policyData?.value?.[policyKey]
    setPolicyDetails(policy ? { severityLevels: policy.severityLevels } : null)
    setSeverityLevelStrikeCount(null)
    setSelectedPolicyName(policyName)
    setSelectedSeverityLevelName('')
  }

  // Reusable handler for severity level selection
  const handleSeverityLevelSelect = (levelName: string) => {
    const levelKey = nameToKey(levelName)
    const level = severityLevelData?.value?.[levelKey]
    setSeverityLevelStrikeCount(
      level?.strikeCount !== undefined ||
        level?.firstOccurrenceStrikeCount !== undefined
        ? level.strikeCount ?? 0
        : null,
    )
    setSelectedSeverityLevelName(levelName)
  }

  // Reset policy/severity level selection when event type changes
  // For reversals, auto-select from last takedown event
  useEffect(() => {
    if (modEventType !== MOD_EVENTS.REVERSE_TAKEDOWN) {
      return
    }

    const lastDetails = getLastContentTakedownDetails()
    if (!lastDetails?.policy || !lastDetails?.severityLevel) {
      return
    }

    setSelectedPolicyName(lastDetails.policy)
    const policyKey = nameToKey(lastDetails.policy)
    const policy = policyData?.value?.[policyKey]
    setPolicyDetails(policy ? { severityLevels: policy.severityLevels } : null)

    if (!isSubjectDid) {
      setSelectedSeverityLevelName(lastDetails.severityLevel)
      if (lastDetails.strikeCount) {
        setSeverityLevelStrikeCount(lastDetails.strikeCount)
      }
    }
  }, [modEventType])

  const isEmailEvent = modEventType === MOD_EVENTS.EMAIL
  const isTagEvent = modEventType === MOD_EVENTS.TAG
  const isLabelEvent = modEventType === MOD_EVENTS.LABEL
  const isDivertEvent = modEventType === MOD_EVENTS.DIVERT
  const isMuteEvent = modEventType === MOD_EVENTS.MUTE
  const isMuteReporterEvent = modEventType === MOD_EVENTS.MUTE_REPORTER
  const isPriorityScoreEvent = modEventType === MOD_EVENTS.SET_PRIORITY
  const isCommentEvent = modEventType === MOD_EVENTS.COMMENT
  const isTakedownEvent = modEventType === MOD_EVENTS.TAKEDOWN
  const isAckEvent = modEventType === MOD_EVENTS.ACKNOWLEDGE
  const isReverseTakedownEvent = modEventType === MOD_EVENTS.REVERSE_TAKEDOWN
  const isAgeAssuranceOverrideEvent =
    modEventType === MOD_EVENTS.AGE_ASSURANCE_OVERRIDE
  const shouldShowDurationInHoursField =
    isTakedownEvent || isMuteEvent || isMuteReporterEvent || isLabelEvent
  const canManageChat = usePermission('canManageChat')
  const canTakedown = usePermission('canTakedown')
  const canSendEmail = usePermission('canSendEmail')

  // Get action recommendation whenever policy, severity level, or strike count changes
  // Only show recommendations for record-level subjects with severity levels
  const eventNeedsActionRecommendation =
    isTakedownEvent || isReverseTakedownEvent || isEmailEvent

  const actionRecommendation =
    eventNeedsActionRecommendation &&
    selectedPolicyName &&
    selectedSeverityLevelName
      ? getRecommendedAction(
          severityLevelStrikeCount,
          selectedSeverityLevelName
            ? severityLevelData?.value?.[selectedSeverityLevelName]
            : undefined,
          selectedPolicyName,
          isReverseTakedownEvent, // Pass true for negative strikes
        )
      : null

  // When action recommendation changes, if we're taking down an account,
  // we need to automatically select the suspension duration based policy and sev level
  useEffect(() => {
    if (
      isSubjectDid &&
      durationSelectorRef.current &&
      actionRecommendation?.suspensionDurationInHours !== undefined
    ) {
      durationSelectorRef.current.value = String(
        actionRecommendation?.suspensionDurationInHours ?? 0,
      )
    }
  }, [isSubjectDid, actionRecommendation?.suspensionDurationInHours])

  // navigate to next or prev report
  const navigateQueue = (delta: 1 | -1) => {
    const len = subjectOptions?.length
    if (len) {
      // if we have a next report, go to it
      const currentSubjectIndex = subjectOptions.indexOf(subject)
      if (currentSubjectIndex !== -1) {
        const nextSubjectIndex = (currentSubjectIndex + len + delta) % len // loop around if we're at the end
        setSubject(subjectOptions[nextSubjectIndex])
      } else {
        setSubject(subjectOptions[0])
      }
    } else {
      // otherwise, just close the panel
      onCancel()
    }
  }
  // Left/right arrows to nav through report subjects
  const evtRef = useRef({ navigateQueue })
  useEffect(() => {
    evtRef.current = { navigateQueue }
  })
  useEffect(() => {
    const downHandler = (ev: WindowEventMap['keydown']) => {
      if (
        ev.key !== 'ArrowLeft' &&
        ev.key !== 'ArrowRight' &&
        ev.key !== 'ArrowDown' &&
        ev.key !== 'ArrowUp'
      ) {
        return
      }
      if (takesKeyboardEvt(ev.target)) {
        return
      }
      evtRef.current.navigateQueue(
        ev.key === 'ArrowLeft' || ev.key === 'ArrowUp' ? -1 : 1,
      )
    }
    window.addEventListener('keydown', downHandler)
    return () => {
      window.removeEventListener('keydown', downHandler)
    }
  }, [])

  const createSubjectFromId = useCreateSubjectFromId()

  // on form submit
  const onFormSubmit = async (
    ev: FormEvent<HTMLFormElement> & { target: HTMLFormElement },
  ) => {
    ev.preventDefault()
    try {
      setSubmission({ isSubmitting: true, error: '' })
      const formData = new FormData(ev.currentTarget)
      const nextLabels = String(formData.get('labels'))!.split(',')
      const shouldMoveToNextSubject = formData.get('moveToNextSubject') === '1'

      const { subject: subjectInfo, record: recordInfo } =
        await createSubjectFromId(subject)

      const subjectBlobCids = formData
        .getAll('subjectBlobCids')
        .map((cid) => String(cid))

      const coreEvent = getEventFromFormData(
        modEventType,
        formData,
        subjectStatus || undefined,
      )
      if (isDivertEvent && !subjectBlobCids.length) {
        throw new Error('blob-selection-required')
      }

      if (
        ToolsOzoneModerationDefs.isModEventTakedown(coreEvent) &&
        !coreEvent.policies
      ) {
        throw new Error('policy-selection-required')
      }

      // Extract the DID from the subject for account-level events
      const subjectDid =
        'did' in subjectInfo ? subjectInfo.did : new AtUri(subject).host

      // This block handles an edge case where a label may be applied to profile record and then the profile record is updated by the user.
      // In that state, if the moderator reverts the label, the event is emitted for the latest CID of the profile entry which does NOT revert
      // the label applied to the old CID.
      // To work around that, this block checks if any label is being reverted and if so, it checks if the event's CID is different than the CID
      // associated with the label that's being negated. If yes, it emits separate events for each such label and after that, if there are more labels
      // left to be created/negated for the current CID, it emits the original event separate event for that.
      if (ToolsOzoneModerationDefs.isModEventLabel(coreEvent)) {
        const labels = diffLabels(
          // Make sure we don't try to negate self labels
          currentLabels.filter((label) => !isSelfLabel(label)),
          nextLabels,
        )
        coreEvent.createLabelVals = labels.createLabelVals
        coreEvent.negateLabelVals = labels.negateLabelVals
        const negatingLabelsByCid: Record<string, string[]> = {}

        if (recordInfo?.labels?.length && 'cid' in subjectInfo) {
          // go through each label we intended to remove
          labels.negateLabelVals.forEach((label) => {
            // go through each label on the record and check if the same label is being removed from multiple CIDs
            recordInfo.labels?.forEach(({ val: originalLabel, cid, src }) => {
              if (
                // Ignore self labels
                src === recordInfo.repo.did ||
                originalLabel !== label ||
                !cid
              ) {
                return
              }
              negatingLabelsByCid[cid] ??= []

              // for the same cid, one label can only exist once so we if it's not already in the list, add it
              if (!negatingLabelsByCid[cid].includes(label)) {
                negatingLabelsByCid[cid].push(label)
              }
              // Since the label being negated is going to be removed from a different CID, let's remove it from the coreEvent
              coreEvent.negateLabelVals = labels.negateLabelVals.filter(
                (l) => l !== label,
              )
            })
          })
        }

        const labelSubmissions: Promise<void>[] = []

        Object.keys(negatingLabelsByCid).forEach((labelCid) => {
          const negateLabelEvent = {
            subject: { ...subjectInfo, cid: labelCid },
            createdBy: accountDid,
            subjectBlobCids,
            event: {
              ...coreEvent,
              // Here we'd never want to create labels associated with different CID than the current one
              createLabelVals: [],
              negateLabelVals: negatingLabelsByCid[labelCid],
            },
          }

          labelSubmissions.push(onSubmit(negateLabelEvent))
        })

        if (
          coreEvent.negateLabelVals.length ||
          coreEvent.createLabelVals.length
        ) {
          labelSubmissions.push(
            onSubmit({
              subject: subjectInfo,
              createdBy: accountDid,
              subjectBlobCids,
              event: coreEvent,
            }),
          )
        }

        await Promise.all(labelSubmissions)
      } else {
        await onSubmit({
          subject: subjectInfo,
          createdBy: accountDid,
          subjectBlobCids,
          event: coreEvent,
        })

        // If this is a record takedown and we have reached a suspension/ban threshold,
        // emit an additional account-level takedown event
        if (
          ToolsOzoneModerationDefs.isModEventTakedown(coreEvent) &&
          !isSubjectDid &&
          actionRecommendation &&
          (actionRecommendation.isPermanent ||
            actionRecommendation.suspensionDurationInHours !== null)
        ) {
          const accountEvent: $Typed<ToolsOzoneModerationDefs.ModEventTakedown> =
            {
              $type: MOD_EVENTS.TAKEDOWN,
              comment: coreEvent.comment,
              policies: coreEvent.policies,
            }

          // Only set durationInHours if not permanent (for suspensions)
          if (
            !actionRecommendation.isPermanent &&
            actionRecommendation.suspensionDurationInHours
          ) {
            accountEvent.durationInHours =
              actionRecommendation.suspensionDurationInHours
          }

          await onSubmit({
            subject: {
              $type: 'com.atproto.admin.defs#repoRef',
              did: subjectDid,
            },
            createdBy: accountDid,
            event: accountEvent,
          })
        }

        // If this is a REVERSE_TAKEDOWN and we've crossed a suspension threshold (going down),
        // emit an account-level REVERSE_TAKEDOWN, and potentially an adjusted TAKEDOWN
        if (
          ToolsOzoneModerationDefs.isModEventReverseTakedown(coreEvent) &&
          actionRecommendation?.needsReverseTakedown
        ) {
          // First, emit account-level REVERSE_TAKEDOWN to remove current suspension
          await onSubmit({
            subject: {
              $type: 'com.atproto.admin.defs#repoRef',
              did: subjectDid,
            },
            createdBy: accountDid,
            event: {
              $type: MOD_EVENTS.REVERSE_TAKEDOWN,
              comment: `Strike reduction - reversing account suspension`,
            },
          })

          // If user still deserves a lower-tier suspension, emit adjusted TAKEDOWN
          if (
            actionRecommendation.adjustedTakedownDurationInHours !==
              undefined &&
            actionRecommendation.adjustedTakedownDurationInHours > 0
          ) {
            await onSubmit({
              subject: {
                $type: 'com.atproto.admin.defs#repoRef',
                did: subjectDid,
              },
              createdBy: accountDid,
              event: {
                $type: MOD_EVENTS.TAKEDOWN,
                comment: `Re-applying suspension at reduced level (adjusted for time served)`,
                durationInHours:
                  actionRecommendation.adjustedTakedownDurationInHours,
                policies: coreEvent.policies,
              },
            })
          }
        }
      }

      if (formData.get('additionalAcknowledgeEvent')) {
        await onSubmit({
          subject: subjectInfo,
          createdBy: accountDid,
          subjectBlobCids,
          // We want the comment from label and other params like label val etc. to NOT be associated with the ack event
          // But leave a specific keyword to indicate that the previous action was definitive
          event: {
            $type: MOD_EVENTS.ACKNOWLEDGE,
            comment: '[DEFINITIVE_PREVIOUS_ACTION]',
          },
        })
      }

      if (formData.get('additionalResolveAppealEvent')) {
        await onSubmit({
          subject: subjectInfo,
          createdBy: accountDid,
          subjectBlobCids,
          event: {
            $type: MOD_EVENTS.RESOLVE_APPEAL,
            comment: '[RESOLVING_APPEAL_DUE_TO_PREVIOUS_ACK_ACTION]',
          },
        })
      }

      refetchSubjectStatus()
      refetchSubject()
      queryClient.invalidateQueries(['modEventList'])

      // After successful submission, reset the form state to clear inputs for previous submission
      ev.target.reset()
      // This state is not kept in the form and driven by state so we need to reset it manually after submission
      // If previous event was takedown and not immediately moving to next subject, moderators are most like to send a follow up email so default to email event
      const eventMayNeedEmail =
        ToolsOzoneModerationDefs.isModEventTakedown(coreEvent) ||
        ToolsOzoneModerationDefs.isModEventReverseTakedown(coreEvent) ||
        ToolsOzoneModerationDefs.isModEventLabel(coreEvent)

      setModEventType(
        eventMayNeedEmail &&
          !shouldMoveToNextSubject &&
          canSendEmail &&
          isSubjectDid
          ? MOD_EVENTS.EMAIL
          : MOD_EVENTS.ACKNOWLEDGE,
      )
      shouldMoveToNextSubject && navigateQueue(1)
      setSubmission({ error: '', isSubmitting: false })
    } catch (err) {
      setSubmission({ error: (err as Error).message, isSubmitting: false })
    }
  }

  const handleEmailSubmit = async (event) => {
    try {
      setSubmission({ isSubmitting: true, error: '' })

      // Augment email event with policy, severity level, and strike count
      const augmentedEvent = { ...event }
      if (selectedPolicyName) {
        augmentedEvent.policies = [selectedPolicyName]
      }
      if (selectedSeverityLevelName) {
        augmentedEvent.severityLevel = selectedSeverityLevelName
      }
      if (severityLevelStrikeCount !== null) {
        // Use actualStrikesToApply from recommendation if available (accounts for strikeOnOccurrence)
        augmentedEvent.strikeCount =
          actionRecommendation?.actualStrikesToApply ?? severityLevelStrikeCount
      }

      await onSubmit({
        event: augmentedEvent,
        subject: {
          $type: 'com.atproto.admin.defs#repoRef',
          did: subject,
        },
        createdBy: accountDid,
      })
      // email event does not change the subject status so only need to refetch mod event list
      queryClient.invalidateQueries(['modEventList'])
      setModEventType(MOD_EVENTS.ACKNOWLEDGE)
      setSubmission({ isSubmitting: false, error: '' })
    } catch (err) {
      setSubmission({ error: (err as Error).message, isSubmitting: false })
    }
  }

  const durationSelectorRef = useRef<HTMLSelectElement>(null)

  // Keyboard shortcuts for action types
  const submitButton = useRef<HTMLButtonElement>(null)
  const moveToNextSubjectRef = useRef<HTMLInputElement>(null)
  const submitForm = () => {
    if (!submitButton.current) return
    submitButton.current.click()
  }
  const submitAndGoNext = () => {
    moveToNextSubjectRef.current?.setAttribute('value', '1')
    submitForm()
  }
  useKeyPressEvent('c', safeKeyHandler(onCancel))
  useKeyPressEvent(
    's',
    safeKeyHandler((e) => {
      e.stopImmediatePropagation()
      submitForm()
    }),
  )
  useKeyPressEvent('n', safeKeyHandler(submitAndGoNext))
  useKeyPressEvent(
    'a',
    safeKeyHandler(() => {
      setModEventType(MOD_EVENTS.ACKNOWLEDGE)
    }),
  )
  useKeyPressEvent(
    'l',
    safeKeyHandler(() => {
      setModEventType(MOD_EVENTS.LABEL)
    }),
  )
  useKeyPressEvent(
    'e',
    safeKeyHandler(() => {
      setModEventType(MOD_EVENTS.ESCALATE)
    }),
  )
  useKeyPressEvent(
    't',
    canTakedown
      ? safeKeyHandler(() => {
          setModEventType(MOD_EVENTS.TAKEDOWN)
        })
      : undefined,
  )

  return {
    config,
    submission,
    navigateQueue,
    onFormSubmit,
    record,
    isSubjectDid,
    profile,
    subjectStatus,
    canManageChat,
    currentLabels,
    allLabels,
    repo,
    modEventType,
    shouldShowDurationInHoursField,
    isLabelEvent,
    isMuteEvent,
    isTakedownEvent,
    isAppealed,
    isPriorityScoreEvent,
    policyData,
    setModEventType,
    setPolicyDetails,
    setSeverityLevelStrikeCount,
    setSelectedPolicyName,
    setSelectedSeverityLevelName,
    policyDetails,
    severityLevelData,
    strikeData,
    strikeDataError,
    currentStrikes,
    actionRecommendation,
    isAgeAssuranceOverrideEvent,
    severityLevelStrikeCount,
    isMuteReporterEvent,
    isTagEvent,
    isEmailEvent,
    isReverseTakedownEvent,
    selectedPolicyName,
    selectedSeverityLevelName,
    isCommentEvent,
    isReviewClosed,
    isEscalated,
    isAckEvent,
    moveToNextSubjectRef,
    durationSelectorRef,
    submitButton,
    submitAndGoNext,
    handleEmailSubmit,
    handlePolicySelect,
    handleSeverityLevelSelect,
  }
}

function useSubjectQuery(subject: string) {
  const labelerAgent = useLabelerAgent()

  const getProfile = async (actor: string) => {
    try {
      const { data: profile } = await labelerAgent.app.bsky.actor.getProfile({
        actor,
      })
      return profile
    } catch (e) {
      return undefined
    }
  }

  return useQuery({
    // subject of the report
    queryKey: ['modActionSubject', subject],
    queryFn: async () => {
      if (subject.startsWith('did:')) {
        const [{ data: repo }, profile] = await Promise.all([
          labelerAgent.tools.ozone.moderation.getRepo({
            did: subject,
          }),
          getProfile(subject),
        ])
        return { repo, profile }
      } else if (subject.startsWith('at://')) {
        const [{ data: record }, profile] = await Promise.all([
          labelerAgent.tools.ozone.moderation.getRecord({
            uri: subject,
          }),
          getProfile(new AtUri(subject).host),
        ])
        return { record, profile }
      } else {
        return {}
      }
    },
  })
}

function useSubjectStatusQuery(subject: string) {
  const labelerAgent = useLabelerAgent()
  return useQuery({
    // subject of the report
    queryKey: ['modSubjectStatus', { subject }],
    queryFn: async () => {
      const {
        data: { subjectStatuses },
      } = await labelerAgent.api.tools.ozone.moderation.queryStatuses({
        subject,
        includeMuted: true,
        limit: 1,
      })
      return subjectStatuses.at(0) || null
    },
  })
}

function isMultiPress(ev: KeyboardEvent) {
  return ev.metaKey || ev.shiftKey || ev.ctrlKey || ev.altKey
}

function safeKeyHandler(handler: (_ev: KeyboardEvent) => void) {
  return (ev: KeyboardEvent) => {
    if (!takesKeyboardEvt(ev.target) && !isMultiPress(ev)) {
      handler(ev)
    }
  }
}
