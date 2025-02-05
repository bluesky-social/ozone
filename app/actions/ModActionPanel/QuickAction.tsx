// TODO: This is badly named so that we can rebuild this component without breaking the old one
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AtUri,
  ComAtprotoModerationDefs,
  ToolsOzoneModerationDefs,
  ToolsOzoneModerationEmitEvent,
} from '@atproto/api'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { ActionPanel } from '@/common/ActionPanel'
import { ButtonPrimary, ButtonSecondary } from '@/common/buttons'
import { Checkbox, FormLabel, Input, Textarea } from '@/common/forms'
import { PropsOf } from '@/lib/types'
import { BlobListFormField } from './BlobList'
import {
  LabelList,
  LabelListEmpty,
  diffLabels,
  getLabelsForSubject,
  toLabelVal,
  isSelfLabel,
  ModerationLabel,
  LabelChip,
} from '@/common/labels'
import { FullScreenActionPanel } from '@/common/FullScreenActionPanel'
import { PreviewCard } from '@/common/PreviewCard'
import { createBreakpoint, useKeyPressEvent } from 'react-use'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline'
import { LabelSelector } from '@/common/labels/Selector'
import { takesKeyboardEvt } from '@/lib/util'
import { Loading } from '@/common/Loader'
import { ActionDurationSelector } from '@/reports/ModerationForm/ActionDurationSelector'
import { MOD_EVENTS } from '@/mod-event/constants'
import { ModEventList } from '@/mod-event/EventList'
import { ModEventSelectorButton } from '@/mod-event/SelectorButton'
import { SubjectReviewStateBadge } from '@/subject/ReviewStateMarker'
import { useCreateSubjectFromId } from '@/reports/helpers/subject'
import { getProfileUriForDid } from '@/reports/helpers/subject'
import { Dialog } from '@headlessui/react'
import { SubjectSwitchButton } from '@/common/SubjectSwitchButton'
import { diffTags } from 'components/tags/utils'
import { ActionError } from '@/reports/ModerationForm/ActionError'
import { Card } from '@/common/Card'
import { DM_DISABLE_TAG, VIDEO_UPLOAD_DISABLE_TAG } from '@/lib/constants'
import { MessageActorMeta } from '@/dms/MessageActorMeta'
import { ModEventDetailsPopover } from '@/mod-event/DetailsPopover'
import { LastReviewedTimestamp } from '@/subject/LastReviewedTimestamp'
import { RecordAuthorStatus } from '@/subject/RecordAuthorStatus'
import {
  useConfigurationContext,
  useLabelerAgent,
  usePermission,
} from '@/shell/ConfigurationContext'
import { SubjectTag } from 'components/tags/SubjectTag'
import { HighProfileWarning } from '@/repositories/HighProfileWarning'
import { EmailComposer } from 'components/email/Composer'
import { ActionPolicySelector } from '@/reports/ModerationForm/ActionPolicySelector'
import { HandRaisedIcon } from '@heroicons/react/24/solid'
import { PriorityScore } from '@/subject/PriorityScore'

const FORM_ID = 'mod-action-panel'
const useBreakpoint = createBreakpoint({ xs: 340, sm: 640 })

type Props = {
  subject: string
  setSubject: (subject: string) => void
  subjectOptions?: string[]
  isInitialLoading: boolean
  onSubmit: (vals: ToolsOzoneModerationEmitEvent.InputSchema) => Promise<void>
}

export function ModActionPanelQuick(
  props: PropsOf<typeof ActionPanel> & Props,
) {
  const {
    subject,
    setSubject,
    subjectOptions,
    onSubmit,
    onClose,
    isInitialLoading,
    ...others
  } = props
  const [replaceFormWithEvents, setReplaceFormWithEvents] = useState(false)
  const breakpoint = useBreakpoint()
  const isMobileView = breakpoint === 'xs'

  return (
    <FullScreenActionPanel
      title={
        <Dialog.Title className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-200 flex flex-row justify-between pr-8">
          Take moderation action
          {isMobileView && (
            <button
              className={`sm:hidden text-xs rounded px-2 ${
                replaceFormWithEvents
                  ? 'bg-indigo-700 text-white'
                  : 'bg-indigo-100 text-indigo-700'
              }`}
              onClick={() => setReplaceFormWithEvents(!replaceFormWithEvents)}
            >
              Events
            </button>
          )}
        </Dialog.Title>
      }
      onClose={onClose}
      {...others}
    >
      {!subjectOptions?.length ? (
        <div className="flex flex-col flex-1 h-full item-center justify-center">
          {isInitialLoading ? (
            <>
              <Loading />{' '}
              <p className="pb-4 text-center text-gray-400 dark:text-gray-50">
                Loading reports...
              </p>
            </>
          ) : (
            <>
              <CheckCircleIcon
                title="No reports"
                className="h-10 w-10 text-green-300 align-text-bottom mx-auto mb-4"
              />
              <p className="pb-4 text-center text-gray-400 dark:text-gray-50">
                No reports found
              </p>
            </>
          )}
        </div>
      ) : (
        <Form
          onCancel={onClose}
          onSubmit={onSubmit}
          subject={subject}
          setSubject={setSubject}
          subjectOptions={subjectOptions}
          replaceFormWithEvents={replaceFormWithEvents && isMobileView}
        />
      )}
    </FullScreenActionPanel>
  )
}

function Form(
  props: {
    onCancel: () => void
    replaceFormWithEvents: boolean
  } & Pick<Props, 'setSubject' | 'subject' | 'subjectOptions' | 'onSubmit'>,
) {
  const { config } = useConfigurationContext()
  const queryClient = useQueryClient()
  const labelerAgent = useLabelerAgent()
  const accountDid = labelerAgent.assertDid

  const {
    subject,
    setSubject,
    subjectOptions,
    onCancel,
    onSubmit,
    replaceFormWithEvents,
    ...others
  } = props
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

  const allLabels = getLabelsForSubject({ repo, record })
  const currentLabels = allLabels.map((label) =>
    toLabelVal(label, repo?.did ?? record?.repo.did),
  )
  const [modEventType, setModEventType] = useState<string>(
    MOD_EVENTS.ACKNOWLEDGE,
  )
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
  const shouldShowDurationInHoursField =
    isTakedownEvent || isMuteEvent || isMuteReporterEvent || isLabelEvent
  const canManageChat = usePermission('canManageChat')
  const canTakedown = usePermission('canTakedown')
  const canSendEmail = usePermission('canSendEmail')

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
      const coreEvent: Parameters<typeof onSubmit>[0]['event'] = {
        $type: modEventType,
      }
      const shouldMoveToNextSubject = formData.get('moveToNextSubject') === '1'

      if (formData.get('durationInHours')) {
        coreEvent.durationInHours = Number(formData.get('durationInHours'))
      }

      if (isTakedownEvent && formData.get('policies')) {
        coreEvent.policies = [String(formData.get('policies'))]
      }

      if (
        (isTakedownEvent || isAckEvent) &&
        formData.get('acknowledgeAccountSubjects')
      ) {
        coreEvent.acknowledgeAccountSubjects = true
      }

      if (formData.get('comment')) {
        coreEvent.comment = formData.get('comment')
      }

      if (formData.get('sticky')) {
        coreEvent.sticky = true
      }

      if (isPriorityScoreEvent) {
        coreEvent.score = Number(formData.get('priorityScore'))
      }

      if (formData.get('tags')) {
        const tags = String(formData.get('tags'))
          .split(',')
          .map((tag) => tag.trim())
        const { add, remove } = diffTags(subjectStatus?.tags || [], tags)
        coreEvent.add = add
        coreEvent.remove = remove
      }

      // Appeal type doesn't really exist, behind the scenes, it's just a report event with special reason
      if (coreEvent.$type === MOD_EVENTS.APPEAL) {
        coreEvent.$type = MOD_EVENTS.REPORT
        coreEvent.reportType = ComAtprotoModerationDefs.REASONAPPEAL
      }

      // Enable and disable dm/video-upload actions are just tag operations behind the scenes
      // so, for those events, we rebuild the coreEvent with the appropriate $type and tags
      if (
        MOD_EVENTS.DISABLE_DMS === coreEvent.$type ||
        MOD_EVENTS.ENABLE_DMS === coreEvent.$type ||
        MOD_EVENTS.DISABLE_VIDEO_UPLOAD === coreEvent.$type ||
        MOD_EVENTS.ENABLE_VIDEO_UPLOAD === coreEvent.$type
      ) {
        if (coreEvent.$type === MOD_EVENTS.DISABLE_DMS) {
          coreEvent.add = [DM_DISABLE_TAG]
          coreEvent.remove = []
        }
        if (coreEvent.$type === MOD_EVENTS.ENABLE_DMS) {
          coreEvent.add = []
          coreEvent.remove = [DM_DISABLE_TAG]
        }
        if (coreEvent.$type === MOD_EVENTS.DISABLE_VIDEO_UPLOAD) {
          coreEvent.add = [VIDEO_UPLOAD_DISABLE_TAG]
          coreEvent.remove = []
        }
        if (coreEvent.$type === MOD_EVENTS.ENABLE_VIDEO_UPLOAD) {
          coreEvent.add = []
          coreEvent.remove = [VIDEO_UPLOAD_DISABLE_TAG]
        }
        coreEvent.$type = MOD_EVENTS.TAG
      }
      const { subject: subjectInfo, record: recordInfo } =
        await createSubjectFromId(subject)

      const subjectBlobCids = formData
        .getAll('subjectBlobCids')
        .map((cid) => String(cid))

      if (isDivertEvent && !subjectBlobCids.length) {
        throw new Error('blob-selection-required')
      }

      if (isTakedownEvent && !coreEvent.policies) {
        throw new Error('policy-selection-required')
      }

      // This block handles an edge case where a label may be applied to profile record and then the profile record is updated by the user.
      // In that state, if the moderator reverts the label, the event is emitted for the latest CID of the profile entry which does NOT revert
      // the label applied to the old CID.
      // To work around that, this block checks if any label is being reverted and if so, it checks if the event's CID is different than the CID
      // associated with the label that's being negated. If yes, it emits separate events for each such label and after that, if there are more labels
      // left to be created/negated for the current CID, it emits the original event separate event for that.
      if (isLabelEvent) {
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
          labelSubmissions.push(
            onSubmit({
              subject: { ...subjectInfo, cid: labelCid },
              createdBy: accountDid,
              subjectBlobCids: formData
                .getAll('subjectBlobCids')
                .map((cid) => String(cid)),
              event: {
                ...coreEvent,
                // Here we'd never want to create labels associated with different CID than the current one
                createLabelVals: [],
                negateLabelVals: negatingLabelsByCid[labelCid],
              },
            }),
          )
        })

        // TODO: Typecasting here is not ideal
        if (
          (coreEvent.negateLabelVals as string[]).length ||
          (coreEvent.createLabelVals as string[]).length
        ) {
          labelSubmissions.push(
            onSubmit({
              subject: subjectInfo,
              createdBy: accountDid,
              subjectBlobCids: formData
                .getAll('subjectBlobCids')
                .map((cid) => String(cid)),
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
      }

      if (formData.get('additionalAcknowledgeEvent')) {
        await onSubmit({
          subject: subjectInfo,
          createdBy: accountDid,
          subjectBlobCids: formData
            .getAll('subjectBlobCids')
            .map((cid) => String(cid)),
          // We want the comment from label and other params like label val etc. to NOT be associated with the ack event
          event: { $type: MOD_EVENTS.ACKNOWLEDGE },
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
        coreEvent.$type === MOD_EVENTS.TAKEDOWN ||
        coreEvent.$type === MOD_EVENTS.REVERSE_TAKEDOWN ||
        coreEvent.$type === MOD_EVENTS.LABEL
      setModEventType(
        eventMayNeedEmail && !shouldMoveToNextSubject && canSendEmail
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
      await onSubmit({
        event,
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

  return (
    <>
      {/* The inline styling is not ideal but there's no easy way to set calc() values in tailwind  */}
      {/* We are basically telling the browser to leave 180px at the bottom of the container to make room for navigation arrows and use the remaining vertical space for the main content where scrolling will be allowed if content overflows */}
      {/* @ts-ignore */}
      <style jsx>{`
        .scrollable-container {
          height: calc(100vh - 100px);
        }
        @supports (-webkit-touch-callout: none) {
          .scrollable-container {
            height: calc(100svh - 100px);
          }
        }
        @media (min-width: 640px) {
          .scrollable-container {
            height: calc(100vh - 180px);
          }
        }
      `}</style>
      <div className="flex overflow-y-auto scrollable-container pt-1">
        <div className="flex sm:w-1/2 flex-col">
          <form id={FORM_ID} onSubmit={onFormSubmit} {...others}>
            <div className="flex flex-col">
              <div className="flex flex-row items-end mb-3">
                <FormLabel
                  label="Subject"
                  htmlFor="subject"
                  className="flex-1"
                  copyButton={{ text: subject, label: 'Copy subject' }}
                  extraLabel={
                    <SubjectSwitchButton
                      subject={subject}
                      setSubject={setSubject}
                    />
                  }
                >
                  <Input
                    type="text"
                    id="subject"
                    name="subject"
                    required
                    list="subject-suggestions"
                    placeholder="Subject"
                    className="block w-full"
                    value={subject}
                    onChange={(ev) => setSubject(ev.target.value)}
                    autoComplete="off"
                  />
                  <datalist id="subject-suggestions">
                    {subjectOptions?.map((subject) => (
                      <option key={subject} value={subject} />
                    ))}
                  </datalist>
                </FormLabel>
              </div>
              {/* PREVIEWS */}
              <div className="max-w-xl">
                <PreviewCard
                  subject={subject}
                  isAuthorDeactivated={!!record?.repo.deactivatedAt}
                  isAuthorTakendown={
                    !!record?.repo.moderation.subjectStatus?.takendown
                  }
                  className="border-2 border-dashed border-gray-300"
                >
                  {!isSubjectDid && record?.repo && (
                    <div className="-ml-1 my-2">
                      <RecordAuthorStatus repo={record.repo} />
                    </div>
                  )}
                </PreviewCard>
              </div>

              {!!subjectStatus && (
                <div className="pb-4">
                  <p className="flex flex-row items-center">
                    {!!subjectStatus?.priorityScore && (
                      <PriorityScore
                        priorityScore={subjectStatus.priorityScore}
                      />
                    )}
                    <SubjectReviewStateBadge subjectStatus={subjectStatus} />
                    <LastReviewedTimestamp subjectStatus={subjectStatus} />
                  </p>
                  {!!subjectStatus.comment && (
                    <Card hint="important" className="mt-2">
                      <strong>Note:</strong> {subjectStatus.comment}
                    </Card>
                  )}
                </div>
              )}

              {record?.blobs && (
                <BlobListFormField
                  blobs={record.blobs}
                  authorDid={record.repo.did}
                  className="mb-3"
                />
              )}
              {isSubjectDid && canManageChat && (
                <div className="mb-3">
                  <MessageActorMeta did={subject} />
                </div>
              )}
              <div className={`mb-3`}>
                <FormLabel label="Labels">
                  <LabelList className="-ml-1 flex-wrap">
                    {!currentLabels.length && (
                      <LabelListEmpty className="ml-1" />
                    )}
                    {allLabels.map((label) => {
                      return (
                        <ModerationLabel
                          key={label.val}
                          label={label}
                          recordAuthorDid={`${repo?.did || record?.repo.did}`}
                        />
                      )
                    })}
                  </LabelList>
                </FormLabel>
              </div>
              {!!subjectStatus?.tags?.length && (
                <div className={`mb-3`}>
                  <FormLabel label="Tags">
                    <LabelList className="-ml-1 flex-wrap gap-1">
                      {subjectStatus.tags.sort().map((tag) => {
                        return <SubjectTag key={tag} tag={tag} />
                      })}
                    </LabelList>
                  </FormLabel>
                </div>
              )}

              {/* This is only meant to be switched on in mobile/small screen view */}
              {/* The parent component ensures to toggle this based on the screen size */}
              {replaceFormWithEvents ? (
                <>
                  <ModEventList
                    subject={subject}
                    stats={{
                      accountStats: subjectStatus?.accountStats,
                      recordsStats: subjectStatus?.recordsStats,
                    }}
                  />
                </>
              ) : (
                <div className="px-1">
                  {profile && (
                    <div className="mb-2">
                      <HighProfileWarning profile={profile} />
                    </div>
                  )}
                  <div className="relative flex flex-row gap-1 items-center">
                    <ModEventSelectorButton
                      subjectStatus={subjectStatus}
                      selectedAction={modEventType}
                      isSubjectDid={isSubjectDid}
                      hasBlobs={!!record?.blobs?.length}
                      setSelectedAction={(action) => setModEventType(action)}
                    />
                    <ModEventDetailsPopover modEventType={modEventType} />
                  </div>
                  {shouldShowDurationInHoursField && (
                    <div className="flex flex-row gap-2">
                      {isPriorityScoreEvent && (
                        <FormLabel
                          label=""
                          className="mt-2 w-1/2"
                          htmlFor="priorityScore"
                        >
                          <Input
                            type="number"
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
                      <FormLabel
                        label=""
                        htmlFor="durationInHours"
                        className={`mb-3 mt-2`}
                      >
                        <ActionDurationSelector
                          action={modEventType}
                          required={isLabelEvent ? false : true}
                          onChange={(e) => {
                            if (e.target.value === '0' && isTakedownEvent) {
                              // When permanent takedown is selected, auto check ack all checkbox
                              const ackAllCheckbox =
                                document.querySelector<HTMLInputElement>(
                                  'input[name="acknowledgeAccountSubjects"]',
                                )
                              if (ackAllCheckbox && !ackAllCheckbox.checked) {
                                ackAllCheckbox.checked = true
                              }
                            }
                          }}
                          labelText={
                            isMuteEvent
                              ? 'Mute duration'
                              : isLabelEvent
                              ? 'Label duration'
                              : isPriorityScoreEvent
                              ? 'Score duration'
                              : ''
                          }
                        />
                      </FormLabel>
                      {isTakedownEvent && (
                        <div className="mt-2 w-full">
                          <ActionPolicySelector name="policies" />
                        </div>
                      )}
                    </div>
                  )}

                  {isMuteReporterEvent && (
                    <p className="text-xs my-3">
                      When a reporter is muted, that account will still be able
                      to report and their reports will show up in the event log.
                      However, their reports {"won't"} change moderation review
                      state of the subject {"they're"} reporting
                    </p>
                  )}

                  {isLabelEvent && (
                    <div className="mt-2">
                      <LabelSelector
                        id="labels"
                        name="labels"
                        form={FORM_ID}
                        defaultLabels={currentLabels.filter((label) => {
                          // If there's a label where the source is the current labeler, it's editable
                          const isEditableLabel = allLabels.some((l) => {
                            return l.val === label && l.src === config.did
                          })
                          return !isSelfLabel(label) && isEditableLabel
                        })}
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
                        defaultValue={subjectStatus?.tags?.join(',') || ''}
                      />
                    </FormLabel>
                  )}

                  {!isEmailEvent && (
                    <div className="mt-2">
                      <Textarea
                        name="comment"
                        placeholder="Reason for action (optional)"
                        className="block w-full mb-3"
                      />
                    </div>
                  )}

                  {isCommentEvent && (
                    <Checkbox
                      value="true"
                      id="sticky"
                      name="sticky"
                      className="mb-3 flex items-center"
                      label="Update the subject's persistent note with this comment"
                    />
                  )}

                  {/* Only show this when moderator tries to apply labels to a DID subject */}
                  {isLabelEvent && isSubjectDid && (
                    <p className="mb-3 text-xs">
                      NOTE: Applying labels to an account overall is a strong
                      intervention. You may want to apply the labels to the
                      user&apos;s profile record instead.{' '}
                      <a
                        href="#"
                        className="underline"
                        onClick={() => setSubject(getProfileUriForDid(subject))}
                      >
                        Click here to switch the subject from account to profile
                        record.
                      </a>
                    </p>
                  )}

                  {isLabelEvent && !isReviewClosed && (
                    <Checkbox
                      value="true"
                      defaultChecked
                      id="additionalAcknowledgeEvent"
                      name="additionalAcknowledgeEvent"
                      className="mb-3 flex items-center leading-3"
                      label={
                        <span className="leading-4">
                          {isEscalated
                            ? `De-escalate the subject and acknowledge all open reports after labeling`
                            : `Acknowledge all open reports after labeling`}
                        </span>
                      }
                    />
                  )}

                  {(isTakedownEvent || isAckEvent) && isSubjectDid && (
                    <Checkbox
                      value="true"
                      id="acknowledgeAccountSubjects"
                      name="acknowledgeAccountSubjects"
                      className="mb-3 flex items-center leading-3"
                      label={
                        <span className="leading-4">
                          Acknowledge all open/escalated/appealed reports on
                          subjects created by this user
                        </span>
                      }
                    />
                  )}

                  {submission.error && (
                    <div className="my-2">
                      <ActionError error={submission.error} />
                    </div>
                  )}

                  {!isEmailEvent && (
                    <div className="mt-auto flex flex-row justify-between">
                      <div>
                        <input
                          ref={moveToNextSubjectRef}
                          type="hidden"
                          name="moveToNextSubject"
                          value="0"
                        />
                        <ButtonSecondary
                          className="px-2 sm:px-4 sm:mr-2"
                          disabled={submission.isSubmitting}
                          onClick={onCancel}
                        >
                          <span className="text-sm sm:text-base">(C)ancel</span>
                        </ButtonSecondary>
                      </div>
                      <div>
                        <ButtonPrimary
                          ref={submitButton}
                          type="submit"
                          disabled={submission.isSubmitting}
                          className="mx-1 px-2 sm:px-4"
                        >
                          <span className="text-sm sm:text-base">(S)ubmit</span>
                        </ButtonPrimary>
                        <ButtonPrimary
                          type="button"
                          disabled={submission.isSubmitting}
                          onClick={submitAndGoNext}
                          className="px-2 sm:px-4"
                        >
                          <span className="text-sm sm:text-base">
                            Submit & (N)ext
                          </span>
                        </ButtonPrimary>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>
          {/* IMPORTANT: This component has a form so we can't nest it inside the above form */}
          {isEmailEvent && isSubjectDid && (
            <div className="ml-2 mt-2">
              <EmailComposer did={subject} handleSubmit={handleEmailSubmit} />
            </div>
          )}
        </div>
        {!replaceFormWithEvents && (
          <div className="hidden sm:block sm:w-1/2 sm:pl-4">
            <ModEventList
              stats={{
                accountStats: subjectStatus?.accountStats,
                recordsStats: subjectStatus?.recordsStats,
              }}
              subject={subject}
            />
          </div>
        )}
      </div>
      {(subjectOptions?.length || 0) > 1 && (
        <div className="flex justify-between mt-auto">
          <ButtonSecondary
            className="px-2 py-1"
            onClick={() => navigateQueue(-1)}
            disabled={submission.isSubmitting}
          >
            <ArrowLeftIcon className="h-3 w-3 sm:h-4 sm:w-4 inline-block align-text-bottom" />
          </ButtonSecondary>

          <ButtonSecondary
            className="px-2 py-1"
            onClick={() => navigateQueue(1)}
            disabled={submission.isSubmitting}
          >
            <ArrowRightIcon className="h-3 w-3 sm:h-4 sm:w-4 inline-block align-text-bottom" />
          </ButtonSecondary>
        </div>
      )}
    </>
  )
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
    queryKey: ['modActionSubject', { subject }],
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
