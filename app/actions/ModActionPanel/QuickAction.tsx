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
  Select,
  Textarea,
} from '../../../components/common/forms'
import { PropsOf } from '../../../lib/types'
import { ResolutionList } from './ResolutionList'
import client from '../../../lib/client'
import { BlobList } from './BlobList'
import {
  LabelsInput,
  diffLabels,
  toLabelVal,
} from '../../../components/common/labels'
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
    goToNextReport?: boolean
  },
) {
  const {
    subject,
    subjectOptions,
    onSubmit,
    onClose,
    goToNextReport,
    ...others
  } = props
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
        goToNextReport={goToNextReport}
      />
    </FullScreenActionPanel>
  )
}

function Form(props: {
  subject?: string
  subjectOptions?: string[]
  onCancel: () => void
  onSubmit: (vals: ModActionFormValues) => Promise<void>
  goToNextReport?: boolean
}) {
  const {
    subject: fixedSubject,
    subjectOptions,
    onCancel,
    onSubmit,
    goToNextReport,
    ...others
  } = props
  const [subject, setSubject] = useState(fixedSubject ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [action, setAction] = useState(ComAtprotoAdminDefs.ACKNOWLEDGE)
  const { data: { record, repo } = {} } = useQuery({
    // subject of the report
    queryKey: ['modActionSubject', { subject }],
    queryFn: () => getSubject(subject),
  })
  // @TODO consider pulling current action details, e.g. description here
  const { currentAction } = record?.moderation ?? repo?.moderation ?? {}
  // @TODO client types
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
  // Left/right arrows to nav through report subjects
  const evtRef = useRef({ subject, subjectOptions })
  useEffect(() => {
    evtRef.current = { subject, subjectOptions }
  })
  useEffect(() => {
    const downHandler = (ev: WindowEventMap['keydown']) => {
      if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') {
        return
      }
      if (takesKeyboardEvt(ev.target)) {
        return
      }
      if (!evtRef.current.subjectOptions?.length) {
        return
      }
      const subjectIndex = evtRef.current.subjectOptions.indexOf(
        evtRef.current.subject,
      )
      if (subjectIndex !== -1) {
        const optionsLength = evtRef.current.subjectOptions.length
        const nextIndex =
          (optionsLength + subjectIndex + (ev.key === 'ArrowLeft' ? -1 : 1)) %
          optionsLength
        setSubject(evtRef.current.subjectOptions[nextIndex])
      } else {
        setSubject(evtRef.current.subjectOptions[0])
      }
    }
    window.addEventListener('keydown', downHandler)
    return () => {
      window.removeEventListener('keydown', downHandler)
    }
  }, [])
  // go to next report
  const goToNextReportButton = () => {
    if (goToNextReport && subjectOptions && subjectOptions.length > 1) {
      // if we have a next report, go to it
      const currentSubjectIndex = subjectOptions.indexOf(subject)
      const nextSubjectIndex = (currentSubjectIndex + 1) % subjectOptions.length // loop around if we're at the end
      setSubject(subjectOptions[nextSubjectIndex])
      return
    }
    // otherwise, just close the panel
    onCancel()
  }
  // on form submit
  const onFormSubmit = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault()
    try {
      setSubmitting(true)
      const formData = new FormData(ev.currentTarget)
      const nextLabels = formData.getAll('labels')!.map((val) => String(val))
      await onSubmit({
        currentActionId: currentAction?.id,
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
      goToNextReportButton()
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
          </div>
        )}
        {record?.blobs && (
          <FormLabel label="Blobs" className="mb-3">
            <BlobList
              blobs={record.blobs}
              disabled={!!currentAction}
              name="subjectBlobCids"
            />
          </FormLabel>
        )}
        <FormLabel label="Action" htmlFor="action" className="mb-3">
          <Select
            id="action"
            name="action"
            disabled={!!currentAction}
            value={currentAction ? currentAction.action : action}
            onChange={(ev) => {
              if (!currentAction) {
                setAction(ev.target.value)
              }
            }}
            required
          >
            <option hidden selected value="">
              Action
            </option>
            {Object.entries(actionOptions).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FormLabel>
        {/* Hidden field exists so that form always has same fields, useful during submission */}
        {currentAction && <input name="action" type="hidden" />}
        {!currentAction && (
          <Textarea
            name="reason"
            placeholder="Details"
            className="block w-full mb-3"
          />
        )}
        <FormLabel label="Labels" className="mb-3">
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
        <FormLabel label="Resolves" className="mb-6">
          <ResolutionList subject={subject || null} name="resolveReportIds" />
        </FormLabel>
        {/* {currentAction && (
        <div className="text-base text-gray-600 mb-3 text-right">
          Resolve with current action?
        </div>
      )} */}
        <div className="mt-auto mb-4 flex flex-row justify-between">
          <ButtonSecondary>
            <ArrowLeftIcon className="h-4 w-4 inline-block align-text-bottom" />
          </ButtonSecondary>
          <div className="mx-auto">
            <ButtonSecondary
              className="mr-4"
              disabled={submitting}
              onClick={onCancel}
            >
              (C)ancel
            </ButtonSecondary>
            <ButtonSecondary
              color="text-white"
              className="text-white bg-green-600 hover:bg-green-700 mr-4"
              disabled={submitting}
              onClick={() => setAction(ComAtprotoAdminDefs.ACKNOWLEDGE)}
            >
              (A)cknowledge
            </ButtonSecondary>
            <ButtonSecondary
              color="text-white"
              className="text-white bg-green-600 hover:bg-green-700 mr-4"
              disabled={submitting}
              onClick={() => setAction(ComAtprotoAdminDefs.ESCALATE)}
            >
              (E)scalate
            </ButtonSecondary>
            <ButtonSecondary
              color="text-white"
              className="text-white bg-amber-600 hover:bg-amber-700 mr-4"
              disabled={submitting}
              onClick={() => setAction(ComAtprotoAdminDefs.FLAG)}
            >
              (F)lag
            </ButtonSecondary>
            <ButtonSecondary
              color="text-white"
              className="text-white bg-red-600 hover:bg-red-700 mr-4"
              disabled={submitting}
              onClick={() => setAction(ComAtprotoAdminDefs.TAKEDOWN)}
            >
              (T)akedown
            </ButtonSecondary>
            <ButtonPrimary
              ref={submitButton}
              type="submit"
              disabled={submitting}
            >
              (S)ubmit
            </ButtonPrimary>
          </div>
          <ButtonSecondary onClick={goToNextReportButton} disabled={submitting}>
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
