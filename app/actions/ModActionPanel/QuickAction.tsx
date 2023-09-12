import { useQuery } from '@tanstack/react-query'
import { ComAtprotoAdminDefs } from '@atproto/api'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { ActionPanel } from '@/common/ActionPanel'
import { ButtonPrimary, ButtonSecondary } from '@/common/buttons'
import {
  FormLabel,
  Input,
  RadioGroup,
  RadioGroupOption,
  Textarea,
} from '@/common/forms'
import { PropsOf } from '@/lib/types'
import { ResolutionList } from './ResolutionList'
import client from '@/lib/client'
import { BlobList } from './BlobList'
import { diffLabels, getLabelsForSubject, toLabelVal } from '@/common/labels'
import { FullScreenActionPanel } from '@/common/FullScreenActionPanel'
import { PreviewCard } from '@/common/PreviewCard'
import { useKeyPressEvent } from 'react-use'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { LabelsGrid } from '@/common/labels/Grid'
import { takesKeyboardEvt } from '@/lib/util'
import { SnoozeAction } from '@/reports/SnoozeAction'
import { getCurrentActionFromRepoOrRecord } from '@/reports/helpers/getCurrentActionFromRepoOrRecord'
import { CurrentModerationAction } from '@/reports/ModerationView/CurrentModerationAction'
import {
  actionOptions,
  getActionClassNames,
} from '@/reports/ModerationView/ActionHelpers'
import { Loading } from '@/common/Loader'
import { AllReportsLinkForSubject } from '@/reports/AllReportsLinkForSubject'
import { ActionDurationSelector } from '@/reports/ModerationForm/ActionDurationSelector'

const FORM_ID = 'mod-action-panel'

type Props = {
  subject?: string
  subjectOptions?: string[]
  isInitialLoading: boolean
  onSubmit: (vals: ModActionFormValues) => Promise<void>
  onSnooze?: (vals: { snoozeDuration: number; subject: string }) => void
}

export function ModActionPanelQuick(
  props: PropsOf<typeof ActionPanel> & Props,
) {
  const {
    subject,
    subjectOptions,
    onSubmit,
    onClose,
    onSnooze,
    isInitialLoading,
    ...others
  } = props
  return (
    <FullScreenActionPanel
      title={`Take moderation action`}
      onClose={onClose}
      {...others}
    >
      {!subjectOptions?.length ? (
        <div className="flex flex-col flex-1 h-full item-center justify-center">
          {isInitialLoading ? (
            <>
              <Loading />{' '}
              <p className="pb-4 text-center text-gray-400">
                Loading reports...
              </p>
            </>
          ) : (
            <>
              <CheckCircleIcon
                title="No reports"
                className="h-10 w-10 text-green-300 align-text-bottom mx-auto mb-4"
              />
              <p className="pb-4 text-center text-gray-400">No reports found</p>
            </>
          )}
        </div>
      ) : (
        <Form
          onCancel={onClose}
          onSubmit={onSubmit}
          subject={subject}
          subjectOptions={subjectOptions}
          onSnooze={onSnooze}
        />
      )}
    </FullScreenActionPanel>
  )
}

function Form(
  props: {
    onCancel: () => void
  } & Pick<Props, 'subject' | 'subjectOptions' | 'onSubmit' | 'onSnooze'>,
) {
  const {
    subject: fixedSubject,
    subjectOptions,
    onCancel,
    onSubmit,
    onSnooze,
    ...others
  } = props
  const [subject, setSubject] = useState(fixedSubject ?? '')
  const [replacingAction, setReplacingAction] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [action, setAction] = useState(ComAtprotoAdminDefs.ACKNOWLEDGE)
  const [durationInHours, setActionDuration] = useState<null | number>(null)
  useEffect(() => {
    setReplacingAction(false)
    setAction(ComAtprotoAdminDefs.ACKNOWLEDGE)
  }, [subject])
  const { data: { record, repo } = {} } = useQuery({
    // subject of the report
    queryKey: ['modActionSubject', { subject }],
    queryFn: () => getSubject(subject),
  })
  // This handles a special case where a deleted subject has a current action,
  // but we weren't able to detect that before form submission. When this happens,
  // we go spelunking for the current action and let the moderator retry.
  const { data: currentActionFallback, refetch: fetchCurrentActionFallback } =
    useQuery({
      enabled: false,
      queryKey: ['subjectCurrentAction', { subject }],
      queryFn: () => {
        return getCurrentAction(subject)
      },
    })
  const { currentAction: currActionMaybeReplace = currentActionFallback } =
    record?.moderation ?? repo?.moderation ?? {}
  const currentAction = replacingAction ? undefined : currActionMaybeReplace

  const allLabels = getLabelsForSubject({ repo, record })
  const currentLabels = allLabels.map((label) =>
    toLabelVal(label, repo?.did ?? record?.repo.did),
  )
  const currentActionDetail = getCurrentActionFromRepoOrRecord({ repo, record })

  // navigate to next or prev report
  const navigateReports = (delta: 1 | -1) => {
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
  const evtRef = useRef({ navigateReports })
  useEffect(() => {
    evtRef.current = { navigateReports }
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
      evtRef.current.navigateReports(
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
      const nextLabels = formData.getAll('labels')!.map((val) => String(val))
      let transformedAction = formData.get('action')!.toString()
      if (transformedAction === 'suspend') {
        transformedAction = ComAtprotoAdminDefs.TAKEDOWN
      }
      await onSubmit({
        replacingAction,
        currentActionId: currActionMaybeReplace?.id,
        subject: formData.get('subject')!.toString(),
        action: transformedAction,
        durationInHours: durationInHours || null,
        reason: formData.get('reason')!.toString(),
        resolveReportIds: formData
          .getAll('resolveReportIds')
          .map((id) => Number(id)),
        subjectBlobCids: formData
          .getAll('subjectBlobCids')
          .map((cid) => String(cid)),
        ...diffLabels(currentLabels, nextLabels),
      })

      // After successful submission, reset the form state to clear inputs for previous submission
      ev.target.reset()

      // Then navigate to the next report in queue
      navigateReports(1)
    } catch (err) {
      if (err?.['error'] === 'SubjectHasAction') {
        fetchCurrentActionFallback()
      }
      throw err
    } finally {
      setSubmitting(false)
    }
  }
  // Keyboard shortcuts for action types
  const submitButton = useRef<HTMLButtonElement>(null)
  const submitForm = () => {
    if (!submitButton.current) return
    submitButton.current.click()
  }
  useKeyPressEvent('c', safeKeyHandler(onCancel))
  useKeyPressEvent('s', safeKeyHandler(submitForm))
  useKeyPressEvent(
    'a',
    safeKeyHandler(() => {
      setAction(ComAtprotoAdminDefs.ACKNOWLEDGE)
    }),
  )
  useKeyPressEvent(
    'e',
    safeKeyHandler(() => {
      setAction(ComAtprotoAdminDefs.ESCALATE)
    }),
  )
  useKeyPressEvent(
    'f',
    safeKeyHandler(() => {
      setAction(ComAtprotoAdminDefs.FLAG)
    }),
  )
  useKeyPressEvent(
    't',
    safeKeyHandler(() => {
      setAction(ComAtprotoAdminDefs.TAKEDOWN)
    }),
  )

  return (
    <form
      id={FORM_ID}
      onSubmit={onFormSubmit}
      {...others}
      className="flex flex-col h-full"
    >
      <div className="flex flex-col h-full">
        <div className="flex flex-row items-end mb-3">
          <FormLabel label="Subject" htmlFor="subject" className="flex-1">
            <Input
              type="text"
              id="subject"
              name="subject"
              required
              readOnly={!!fixedSubject}
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
          {subject && onSnooze && (
            <div className="ml-4 mr-2">
              <SnoozeAction
                panelClassName="-right-2 px-2 mt-2"
                onConfirm={(snoozeDuration) => {
                  onSnooze({ snoozeDuration, subject })
                  onCancel()
                }}
              />
            </div>
          )}
        </div>
        {currentAction && (
          <div className="mb-4 -mt-2">
            <AllReportsLinkForSubject
              className="underline text-black"
              onClick={() => onCancel()}
              subject={subject}
            />
          </div>
        )}
        {/* PREVIEWS */}
        <div className="max-w-xl">
          <PreviewCard did={subject} />

          {/* User who reported  */}
          {record?.moderation?.reports[0]?.reportedBy && (
            <PreviewCard
              did={record.moderation.reports[0].reportedBy}
              title="Most recently reported by user"
            />
          )}
          {repo?.moderation?.reports[0]?.reportedBy && (
            <PreviewCard
              did={repo.moderation.reports[0].reportedBy}
              title="Most recently reported by user"
            />
          )}
        </div>
        {record?.blobs && (
          <FormLabel
            label="Blobs"
            className={`mb-3 ${currentAction ? 'opacity-75' : ''}`}
          >
            <BlobList
              blobs={record.blobs}
              disabled={!!currentAction}
              name="subjectBlobCids"
            />
          </FormLabel>
        )}
        <FormLabel
          label="Labels"
          className={`mb-3 ${currentAction ? 'opacity-75' : ''}`}
        >
          <LabelsGrid
            id="labels"
            name="labels"
            formId={FORM_ID}
            subject={subject}
            disabled={!!currentAction}
            defaultLabels={currentLabels}
          />
        </FormLabel>
        {/* Hidden field exists so that form always has same fields, useful during submission */}
        {currentAction && <input name="reason" type="hidden" />}
        <FormLabel
          label="Resolves"
          className={`mb-3 ${currentAction ? 'opacity-75' : ''}`}
        >
          <ResolutionList subject={subject || null} name="resolveReportIds" />
        </FormLabel>
        <div className="mt-auto">
          <CurrentModerationAction
            currentAction={currentAction}
            replacingAction={replacingAction}
            currentActionDetail={currentActionDetail}
            currentActionMaybeReplace={currActionMaybeReplace}
            toggleReplaceMode={() => {
              setReplacingAction((replacing) => !replacing)
            }}
          />

          {action === ComAtprotoAdminDefs.TAKEDOWN && (
            <FormLabel label="" htmlFor="durationInHours" className={`mb-3`}>
              <ActionDurationSelector
                value={durationInHours ?? undefined}
                onChange={(ev) => {
                  setActionDuration(
                    ev.target.value ? parseInt(ev.target.value) : null,
                  )
                }}
              />
            </FormLabel>
          )}

          {/* Hidden field exists so that form always has same fields, useful during submission */}
          {currentAction && <input name="action" type="hidden" />}
          {currActionMaybeReplace && (
            <div className="text-base text-gray-600 mb-3">
              {!replacingAction && 'Resolve with current action?'}
            </div>
          )}
          {!currentAction && (
            <Textarea
              name="reason"
              placeholder="Reason for action (optional)"
              className="block w-full mb-3"
            />
          )}
        </div>
        <div className="mb-4 w-full flex flex-row justify-between">
          <ButtonSecondary
            onClick={() => navigateReports(-1)}
            disabled={submitting}
          >
            <ArrowLeftIcon className="h-4 w-4 inline-block align-text-bottom" />
          </ButtonSecondary>
          <div className="flex flex-1">
            <ButtonSecondary
              className="mx-1 px-0 sm:px-4 sm:ml-2 sm:mr-4"
              disabled={submitting}
              onClick={onCancel}
            >
              <span className='-rotate-90 sm:rotate-0 text-sm sm:text-base'>(C)ancel</span>
            </ButtonSecondary>
            <RadioGroup className={`w-2/5 md:w-full ${currentAction ? 'opacity-75' : ''}`}>
              {Object.entries(actionOptions).map(([value, label], i, arr) => {
                const actionTextClassNames = getActionClassNames({
                  action: value,
                })
                const displayLabel =
                  (value === ComAtprotoAdminDefs.TAKEDOWN && durationInHours) ||
                  (currentAction?.action === ComAtprotoAdminDefs.TAKEDOWN &&
                    currentAction?.durationInHours)
                    ? 'Suspend'
                    : label
                return (
                  <RadioGroupOption
                    key={value}
                    name="action"
                    value={value}
                    required
                    disabled={!!currentAction}
                    last={arr.length - 1 === i}
                    checked={
                      currentAction
                        ? value === currentAction.action
                        : value === action
                    }
                    onChange={(ev) => {
                      if (!currentAction) {
                        setAction(ev.target.value)
                        // When selecting non-takedown action, if a duration for takedown was set before, reset it
                        // Non-takedown actions can't have a duration at the moment
                        if (
                          ev.target.value !== ComAtprotoAdminDefs.TAKEDOWN &&
                          durationInHours
                        ) {
                          setActionDuration(null)
                        }
                      }
                    }}
                    labelClassName={actionTextClassNames}
                  >
                    {displayLabel}
                  </RadioGroupOption>
                )
              })}
            </RadioGroup>
            <ButtonPrimary
              ref={submitButton}
              type="submit"
              disabled={submitting}
              className="mx-1 px-0 sm:px-4 sm:ml-4 sm:mr-2"
            >
              <span className='-rotate-90 sm:rotate-0 text-sm sm:text-base'>(S)ubmit</span>
            </ButtonPrimary>
          </div>
          <ButtonSecondary
            onClick={() => navigateReports(1)}
            disabled={submitting}
          >
            <ArrowRightIcon className="h-4 w-4 inline-block align-text-bottom" />
          </ButtonSecondary>
        </div>
      </div>
    </form>
  )
}

export type ModActionFormValues = {
  subject: string
  action: string
  reason: string
  durationInHours: number | null
  resolveReportIds: number[]
  subjectBlobCids: string[]
  currentActionId?: number
  replacingAction?: boolean
  createLabelVals: string[]
  negateLabelVals: string[]
}

async function getSubject(subject: string) {
  if (subject.startsWith('did:')) {
    const { data: repo } = await client.api.com.atproto.admin.getRepo(
      { did: subject },
      { headers: client.adminHeaders() },
    )
    return { repo }
  } else if (subject.startsWith('at://')) {
    const { data: record } = await client.api.com.atproto.admin.getRecord(
      { uri: subject },
      { headers: client.adminHeaders() },
    )
    return { record }
  } else {
    return {}
  }
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

async function getCurrentAction(subject: string) {
  const result = await client.api.com.atproto.admin.getModerationActions(
    { subject },
    { headers: client.adminHeaders() },
  )

  return result.data.actions.find(
    (action) =>
      !action.reversal &&
      (action.subject.did === subject || action.subject.uri === subject),
  )
}
