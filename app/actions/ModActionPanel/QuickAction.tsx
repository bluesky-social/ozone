// TODO: This is badly named so that we can rebuild this component without breaking the old one
import { useQuery } from '@tanstack/react-query'
import {
  ComAtprotoAdminDefs,
  ComAtprotoAdminEmitModerationEvent,
  ComAtprotoModerationDefs,
} from '@atproto/api'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { ActionPanel } from '@/common/ActionPanel'
import { ButtonPrimary, ButtonSecondary } from '@/common/buttons'
import { Checkbox, FormLabel, Input, Textarea } from '@/common/forms'
import { PropsOf } from '@/lib/types'
import client from '@/lib/client'
import { BlobList } from './BlobList'
import { queryClient } from 'components/QueryClient'
import {
  LabelChip,
  LabelList,
  LabelListEmpty,
  diffLabels,
  displayLabel,
  getLabelGroupInfo,
  getLabelsForSubject,
  toLabelVal,
  unFlagSelfLabel,
  isSelfLabel,
} from '@/common/labels'
import { FullScreenActionPanel } from '@/common/FullScreenActionPanel'
import { PreviewCard } from '@/common/PreviewCard'
import { createBreakpoint, useKeyPressEvent } from 'react-use'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { LabelSelector } from '@/common/labels/Grid'
import { takesKeyboardEvt } from '@/lib/util'
import { Loading } from '@/common/Loader'
import { ActionDurationSelector } from '@/reports/ModerationForm/ActionDurationSelector'
import { MOD_EVENTS } from '@/mod-event/constants'
import { ModEventList } from '@/mod-event/EventList'
import { ModEventSelectorButton } from '@/mod-event/SelectorButton'
import { createSubjectFromId } from '@/reports/helpers/subject'
import { SubjectReviewStateBadge } from '@/subject/ReviewStateMarker'
import { getProfileUriForDid } from '@/reports/helpers/subject'
import { Dialog } from '@headlessui/react'
import { SubjectSwitchButton } from '@/common/SubjectSwitchButton'
import { diffTags } from 'components/tags/utils'

const FORM_ID = 'mod-action-panel'
const useBreakpoint = createBreakpoint({ xs: 340, sm: 640 })

type Props = {
  subject: string
  setSubject: (subject: string) => void
  subjectOptions?: string[]
  isInitialLoading: boolean
  onSubmit: (
    vals: ComAtprotoAdminEmitModerationEvent.InputSchema,
  ) => Promise<void>
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

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
  const {
    subject,
    setSubject,
    subjectOptions,
    onCancel,
    onSubmit,
    replaceFormWithEvents,
    ...others
  } = props
  const [submitting, setSubmitting] = useState(false)
  const { data: subjectStatus, refetch: refetchSubjectStatus } = useQuery({
    // subject of the report
    queryKey: ['modSubjectStatus', { subject }],
    queryFn: () => getSubjectStatus(subject),
  })
  const { data: { record, repo } = {}, refetch: refetchSubject } = useQuery({
    // subject of the report
    queryKey: ['modActionSubject', { subject }],
    queryFn: () => getSubject(subject),
  })
  const isSubjetDid = subject.startsWith('did:')
  const isReviewClosed =
    subjectStatus?.reviewState === ComAtprotoAdminDefs.REVIEWCLOSED
  const isEscalated =
    subjectStatus?.reviewState === ComAtprotoAdminDefs.REVIEWESCALATED

  const allLabels = getLabelsForSubject({ repo, record })
  const currentLabels = allLabels.map((label) =>
    toLabelVal(label, repo?.did ?? record?.repo.did),
  )
  const [modEventType, setModEventType] = useState<string>(
    MOD_EVENTS.ACKNOWLEDGE,
  )
  const isTagEvent = modEventType === MOD_EVENTS.TAG
  const isLabelEvent = modEventType === MOD_EVENTS.LABEL
  const isMuteEvent = modEventType === MOD_EVENTS.MUTE
  const isCommentEvent = modEventType === MOD_EVENTS.COMMENT
  const shouldShowDurationInHoursField =
    modEventType === MOD_EVENTS.TAKEDOWN || isMuteEvent

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
  // on form submit
  const onFormSubmit = async (
    ev: FormEvent<HTMLFormElement> & { target: HTMLFormElement },
  ) => {
    ev.preventDefault()
    try {
      setSubmitting(true)
      const formData = new FormData(ev.currentTarget)
      const nextLabels = String(formData.get('labels'))!.split(',')
      const coreEvent: Parameters<typeof onSubmit>[0]['event'] = {
        $type: modEventType,
      }
      const shouldMoveToNextSubject = formData.get('moveToNextSubject') === '1'

      if (formData.get('durationInHours')) {
        coreEvent.durationInHours = Number(formData.get('durationInHours'))
      }

      if (formData.get('comment')) {
        coreEvent.comment = formData.get('comment')
      }

      if (formData.get('sticky')) {
        coreEvent.sticky = true
      }

      if (formData.get('tags')) {
        const tags = String(formData.get('tags'))
          .split(',')
          .map((tag) => tag.trim())
        const { add, remove } = diffTags(subjectStatus?.tags || [], tags)
        coreEvent.add = add
        coreEvent.remove = remove
      }

      const { subject: subjectInfo, record: recordInfo } =
        await createSubjectFromId(subject)

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
          labels.negateLabelVals.forEach((label) => {
            const existingLabelWithDifferentCid = recordInfo.labels?.find(
              ({ val: originalLabel, cid, src }) => {
                return (
                  originalLabel === label &&
                  cid !== subjectInfo.cid &&
                  // Ignore self labels
                  src !== recordInfo.repo.did
                )
              },
            )
            if (!!existingLabelWithDifferentCid?.cid) {
              negatingLabelsByCid[existingLabelWithDifferentCid.cid] ??= []

              negatingLabelsByCid[existingLabelWithDifferentCid.cid].push(label)
              // Since the label being negated is going to be removed from a different CID
              coreEvent.negateLabelVals = labels.negateLabelVals.filter(
                (l) => l !== label,
              )
            }
          })
        }

        const labelSubmissions: Promise<void>[] = []

        Object.keys(negatingLabelsByCid).forEach((labelCid) =>
          labelSubmissions.push(
            onSubmit({
              subject: { ...subjectInfo, cid: labelCid },
              createdBy: client.session.did,
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
          ),
        )

        // TODO: Typecasting here is not ideal
        if (
          (coreEvent.negateLabelVals as string[]).length ||
          (coreEvent.createLabelVals as string[]).length
        ) {
          labelSubmissions.push(
            onSubmit({
              subject: subjectInfo,
              createdBy: client.session.did,
              subjectBlobCids: formData
                .getAll('subjectBlobCids')
                .map((cid) => String(cid)),
              event: coreEvent,
            }),
          )
        }

        await Promise.all(labelSubmissions)
      } else {
        if (coreEvent.$type === MOD_EVENTS.REPORT) {
          coreEvent.reportType = ComAtprotoModerationDefs.REASONAPPEAL
        }
        await onSubmit({
          subject: subjectInfo,
          createdBy: client.session.did,
          subjectBlobCids: formData
            .getAll('subjectBlobCids')
            .map((cid) => String(cid)),
          event: coreEvent,
        })
      }

      if (formData.get('additionalAcknowledgeEvent')) {
        await onSubmit({
          subject: subjectInfo,
          createdBy: client.session.did,
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
      setModEventType(MOD_EVENTS.ACKNOWLEDGE)
      shouldMoveToNextSubject && navigateQueue(1)
    } catch (err) {
      throw err
    } finally {
      setSubmitting(false)
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
  useKeyPressEvent('s', safeKeyHandler(submitForm))
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
    safeKeyHandler(() => {
      setModEventType(MOD_EVENTS.TAKEDOWN)
    }),
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
        @media (min-width: 640px) {
          .scrollable-container {
            height: calc(100vh - 180px);
          }
        }
      `}</style>
      <div className="flex overflow-y-auto scrollable-container pt-1">
        <form
          id={FORM_ID}
          onSubmit={onFormSubmit}
          {...others}
          className="flex sm:w-1/2 flex-col"
        >
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
              <PreviewCard did={subject} />
            </div>

            {!!subjectStatus && (
              <div className="pb-4">
                <p>
                  <SubjectReviewStateBadge subjectStatus={subjectStatus} />

                  {subjectStatus.lastReviewedAt ? (
                    <span className="pl-1">
                      Last reviewed at:{' '}
                      {dateFormatter.format(
                        new Date(subjectStatus.lastReviewedAt),
                      )}
                    </span>
                  ) : (
                    <span className="pl-1">Not yet reviewed</span>
                  )}
                </p>
                {!!subjectStatus.comment && (
                  <p className="pt-1">
                    <strong>Note:</strong> {subjectStatus.comment}
                  </p>
                )}
              </div>
            )}

            {record?.blobs && (
              <FormLabel
                label="Blobs"
                className={`mb-3 ${subjectStatus ? 'opacity-75' : ''}`}
              >
                <BlobList
                  blobs={record.blobs}
                  name="subjectBlobCids"
                  disabled={false}
                />
              </FormLabel>
            )}
            <div className={`mb-3`}>
              <FormLabel label="Labels">
                <LabelList className="-ml-1">
                  {!currentLabels.length && <LabelListEmpty className="ml-1" />}
                  {currentLabels.map((label) => {
                    const labelGroup = getLabelGroupInfo(unFlagSelfLabel(label))

                    return (
                      <LabelChip
                        key={label}
                        style={{ color: labelGroup.color }}
                      >
                        {displayLabel(label)}
                      </LabelChip>
                    )
                  })}
                </LabelList>
              </FormLabel>
            </div>
            {!!subjectStatus?.tags?.length && (
              <div className={`mb-3`}>
                <FormLabel label="Tags">
                  <LabelList className="-ml-1">
                    {subjectStatus.tags.map((tag) => {
                      return <LabelChip key={tag}>{tag}</LabelChip>
                    })}
                  </LabelList>
                </FormLabel>
              </div>
            )}

            {/* This is only meant to be switched on in mobile/small screen view */}
            {/* The parent component ensures to toggle this based on the screen size */}
            {replaceFormWithEvents ? (
              <ModEventList subject={subject} />
            ) : (
              <div className="px-1">
                <div className="relative">
                  <ModEventSelectorButton
                    subjectStatus={subjectStatus}
                    selectedAction={modEventType}
                    setSelectedAction={(action) => setModEventType(action)}
                  />
                </div>
                {shouldShowDurationInHoursField && (
                  <FormLabel
                    label=""
                    htmlFor="durationInHours"
                    className={`mb-3 mt-2`}
                  >
                    <ActionDurationSelector
                      action={modEventType}
                      labelText={isMuteEvent ? 'Mute duration' : ''}
                    />
                  </FormLabel>
                )}

                {isLabelEvent && (
                  <FormLabel label="Labels" className="mt-2">
                    <LabelSelector
                      id="labels"
                      name="labels"
                      formId={FORM_ID}
                      defaultLabels={currentLabels.filter(
                        (label) => !isSelfLabel(label),
                      )}
                    />
                  </FormLabel>
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

                <div className="mt-2">
                  <Textarea
                    name="comment"
                    placeholder="Reason for action (optional)"
                    className="block w-full mb-3"
                  />
                </div>
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
                {isLabelEvent && isSubjetDid && (
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
                      disabled={submitting}
                      onClick={onCancel}
                    >
                      <span className="text-sm sm:text-base">(C)ancel</span>
                    </ButtonSecondary>
                  </div>
                  <div>
                    <ButtonPrimary
                      ref={submitButton}
                      type="submit"
                      disabled={submitting}
                      className="mx-1 px-2 sm:px-4"
                    >
                      <span className="text-sm sm:text-base">(S)ubmit</span>
                    </ButtonPrimary>
                    <ButtonPrimary
                      type="button"
                      disabled={submitting}
                      onClick={submitAndGoNext}
                      className="px-2 sm:px-4"
                    >
                      <span className="text-sm sm:text-base">
                        Submit & (N)ext
                      </span>
                    </ButtonPrimary>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>
        {!replaceFormWithEvents && (
          <div className="hidden sm:block sm:w-1/2 sm:pl-4">
            <ModEventList subject={subject} />
          </div>
        )}
      </div>
      {(subjectOptions?.length || 0) > 1 && (
        <div className="flex justify-between mt-auto">
          <ButtonSecondary
            onClick={() => navigateQueue(-1)}
            disabled={submitting}
          >
            <ArrowLeftIcon className="h-4 w-4 inline-block align-text-bottom" />
          </ButtonSecondary>

          <ButtonSecondary
            onClick={() => navigateQueue(1)}
            disabled={submitting}
          >
            <ArrowRightIcon className="h-4 w-4 inline-block align-text-bottom" />
          </ButtonSecondary>
        </div>
      )}
    </>
  )
}

async function getSubject(subject: string) {
  if (subject.startsWith('did:')) {
    const { data: repo } = await client.api.com.atproto.admin.getRepo(
      {
        did: subject,
      },
      { headers: client.proxyHeaders() },
    )
    return { repo }
  } else if (subject.startsWith('at://')) {
    const { data: record } = await client.api.com.atproto.admin.getRecord(
      {
        uri: subject,
      },
      { headers: client.proxyHeaders() },
    )
    return { record }
  } else {
    return {}
  }
}

async function getSubjectStatus(subject: string) {
  const {
    data: { subjectStatuses },
  } = await client.api.com.atproto.admin.queryModerationStatuses(
    {
      subject,
      includeMuted: true,
      limit: 1,
    },
    { headers: client.proxyHeaders() },
  )
  return subjectStatuses.at(0) || null
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
