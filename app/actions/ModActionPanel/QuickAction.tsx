import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { ComAtprotoAdminDefs } from '@atproto/api'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { ShieldExclamationIcon } from '@heroicons/react/20/solid'
import { ActionPanel } from '../../../components/common/ActionPanel'
import {
  ButtonPrimary,
  ButtonSecondary,
} from '../../../components/common/buttons'
import {
  FormLabel,
  Input,
  RadioGroup,
  RadioGroupOption,
  Select,
  Textarea,
} from '../../../components/common/forms'
import { PropsOf } from '../../../lib/types'
import { ResolutionList } from './ResolutionList'
import client from '../../../lib/client'
import { BlobList } from './BlobList'
import { diffLabels, toLabelVal } from '../../../components/common/labels'
import { FullScreenActionPanel } from '../../../components/common/FullScreenActionPanel'
import { PreviewCard } from '../../../components/common/PreviewCard'
import { useKeyPressEvent } from 'react-use'
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { LabelsGrid } from '../../../components/common/labels/Grid'
import { takesKeyboardEvt } from '../../../lib/util'

const FORM_ID = 'mod-action-panel'

export function ModActionPanelQuick(
  props: PropsOf<typeof ActionPanel> & {
    subject?: string
    subjectOptions?: string[]
    onSubmit: (vals: ModActionFormValues) => Promise<void>
  },
) {
  const { subject, subjectOptions, onSubmit, onClose, ...others } = props
  return (
    <FullScreenActionPanel
      title={`Take moderation action`}
      onClose={onClose}
      {...others}
    >
      <Form
        onCancel={onClose}
        onSubmit={onSubmit}
        subject={subject}
        subjectOptions={subjectOptions}
      />
    </FullScreenActionPanel>
  )
}

function Form(props: {
  subject?: string
  subjectOptions?: string[]
  onCancel: () => void
  onSubmit: (vals: ModActionFormValues) => Promise<void>
}) {
  const {
    subject: fixedSubject,
    subjectOptions,
    onCancel,
    onSubmit,
    ...others
  } = props
  const [subject, setSubject] = useState(fixedSubject ?? '')
  const [replacingAction, setReplacingAction] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [action, setAction] = useState(ComAtprotoAdminDefs.ACKNOWLEDGE)
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
      queryFn: () => getCurrentAction(subject),
    })
  const { currentAction: currActionMaybeReplace = currentActionFallback } =
    record?.moderation ?? repo?.moderation ?? {}
  const currentAction = replacingAction ? undefined : currActionMaybeReplace
  const currentLabels = (
    (record?.labels ?? repo?.labels ?? []) as { val: string }[]
  ).map(toLabelVal)
  const actionColorClasses =
    currentAction?.action === ComAtprotoAdminDefs.TAKEDOWN
      ? 'text-rose-600 hover:text-rose-700'
      : 'text-indigo-600 hover:text-indigo-900'
  const displayActionType = currentAction?.action.replace(
    'com.atproto.admin.defs#',
    '',
  )
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
  const onFormSubmit = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault()
    try {
      setSubmitting(true)
      const formData = new FormData(ev.currentTarget)
      const nextLabels = formData.getAll('labels')!.map((val) => String(val))
      await onSubmit({
        replacingAction,
        currentActionId: currActionMaybeReplace?.id,
        subject: formData.get('subject')!.toString(),
        action: formData.get('action')!.toString(),
        reason: formData.get('reason')!.toString(),
        resolveReportIds: formData
          .getAll('resolveReportIds')
          .map((id) => Number(id)),
        subjectBlobCids: formData
          .getAll('subjectBlobCids')
          .map((cid) => String(cid)),
        ...diffLabels(currentLabels, nextLabels),
      })
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
        <FormLabel label="Subject" htmlFor="subject" className="mb-3">
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
        {/* PREVIEWS */}
        <div className="max-w-xl">
          <PreviewCard did={subject} />
        </div>
        {currentAction && (
          <div className="text-base text-gray-600 mb-3">
            Subject already has current action{' '}
            <Link
              href={`/actions/${currentAction.id}`}
              title={displayActionType}
              className={actionColorClasses}
            >
              <ShieldExclamationIcon className="h-4 w-4 inline-block align-text-bottom" />{' '}
              #{currentAction.id}
            </Link>
            .<br />
            <span
              role="button"
              className="rounded bg-white px-1.5 py-1 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 cursor-pointer"
              onClick={() => setReplacingAction(true)}
            >
              Click here
            </span>{' '}
            to replace this action.
          </div>
        )}
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
        {/* Hidden field exists so that form always has same fields, useful during submission */}
        {currentAction && <input name="action" type="hidden" />}
        <FormLabel
          label="Labels"
          className={`mb-3 ${currentAction ? 'opacity-75' : ''}`}
        >
          <LabelsGrid
            id="labels"
            name="labels"
            formId={FORM_ID}
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
          {currActionMaybeReplace && (
            <div className="text-base text-gray-600 mb-3 text-right">
              {!replacingAction && 'Resolve with current action?'}
              {replacingAction && (
                <>
                  Replacing the current action{' '}
                  <Link
                    href={`/actions/${currActionMaybeReplace.id}`}
                    title={displayActionType}
                    className={actionColorClasses}
                  >
                    <ShieldExclamationIcon className="h-4 w-4 inline-block align-text-bottom" />{' '}
                    #{currActionMaybeReplace.id}
                  </Link>
                  .<br />
                  <span
                    role="button"
                    className="rounded bg-white px-1.5 py-1 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setReplacingAction(false)}
                  >
                    Click here
                  </span>{' '}
                  to stop replacing.
                </>
              )}
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
        <div className="mb-4 flex flex-row justify-between">
          <ButtonSecondary
            onClick={() => navigateReports(-1)}
            disabled={submitting}
          >
            <ArrowLeftIcon className="h-4 w-4 inline-block align-text-bottom" />
          </ButtonSecondary>
          <div className="flex flex-1">
            <ButtonSecondary
              className="ml-2 mr-4"
              disabled={submitting}
              onClick={onCancel}
            >
              (C)ancel
            </ButtonSecondary>
            <RadioGroup className={`${currentAction ? 'opacity-75' : ''}`}>
              {Object.entries(actionOptions).map(([value, label], i, arr) => (
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
                    }
                  }}
                >
                  {label}
                </RadioGroupOption>
              ))}
            </RadioGroup>
            <ButtonPrimary
              ref={submitButton}
              type="submit"
              disabled={submitting}
              className="ml-4 mr-2"
            >
              (S)ubmit
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

export const actionOptions = {
  [ComAtprotoAdminDefs.ACKNOWLEDGE]: 'Acknowledge',
  [ComAtprotoAdminDefs.ESCALATE]: 'Escalate',
  [ComAtprotoAdminDefs.FLAG]: 'Flag',
  [ComAtprotoAdminDefs.TAKEDOWN]: 'Takedown',
}

export type ModActionFormValues = {
  subject: string
  action: string
  reason: string
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

function safeKeyHandler(handler: (_ev: KeyboardEvent) => void) {
  return (ev: KeyboardEvent) => {
    if (!takesKeyboardEvt(ev.target)) {
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
