import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { ComAtprotoAdminDefs } from '@atproto/api'
import { useEffect, useRef, useState } from 'react'
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
import { RecordCard, RepoCard } from '../../../components/common/RecordCard'
import { PropsOf } from '../../../lib/types'
import { ResolutionList } from './ResolutionList'
import client from '../../../lib/client'
import { BlobList } from './BlobList'
import {
  LabelsInput,
  diffLabels,
  toLabelVal,
} from '../../../components/common/labels'

const FORM_ID = 'mod-action-panel'

export function ModActionPanel(
  props: PropsOf<typeof ActionPanel> & {
    subject?: string
    subjectOptions?: string[]
    onSubmit: (vals: ModActionFormValues) => Promise<void>
  },
) {
  const { subject, subjectOptions, onSubmit, onClose, ...others } = props
  return (
    <ActionPanel title="Take moderation action" onClose={onClose} {...others}>
      <Form
        onCancel={onClose}
        onSubmit={onSubmit}
        subject={subject}
        subjectOptions={subjectOptions}
      />
    </ActionPanel>
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
  const [submitting, setSubmitting] = useState(false)
  const [action, setAction] = useState(ComAtprotoAdminDefs.ACKNOWLEDGE)
  const { data: { record, repo } = {} } = useQuery({
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
  // @TODO consider pulling current action details, e.g. description here
  const { currentAction = currentActionFallback } =
    record?.moderation ?? repo?.moderation ?? {}
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
      if (ev.target && ev.target !== document.body) {
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
  return (
    <form
      id={FORM_ID}
      onSubmit={async (ev) => {
        ev.preventDefault()
        try {
          setSubmitting(true)
          const formData = new FormData(ev.currentTarget)
          const nextLabels = formData
            .getAll('labels')!
            .map((val) => String(val))
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
          onCancel() // Close
        } catch (err) {
          if (err?.['error'] === 'SubjectHasAction') {
            fetchCurrentActionFallback()
          }
          throw err
        } finally {
          setSubmitting(false)
        }
      }}
      {...others}
    >
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
      {subject.startsWith('at://') && (
        <div className="rounded border-2 border-dashed border-gray-300 p-2 pb-0 mb-3">
          <RecordCard uri={subject} />
        </div>
      )}
      {subject.startsWith('did:') && (
        <div className="rounded border-2 border-dashed border-gray-300 p-2 pb-1 mb-3">
          <RepoCard did={subject} />
        </div>
      )}
      {!subject.startsWith('at://') && !subject.startsWith('did:') && (
        <div className="rounded border-2 border-dashed border-gray-300 p-2 mb-3 text-center">
          <span className="text-xs text-gray-400">Preview</span>
        </div>
      )}
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
          required={action !== ComAtprotoAdminDefs.ACKNOWLEDGE}
          placeholder="Details"
          className="block w-full mb-3"
        />
      )}
      <FormLabel label="Labels" className="mb-3">
        <LabelsInput
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
      {currentAction && (
        <div className="text-base text-gray-600 mb-3 text-right">
          Resolve with current action?
        </div>
      )}
      <div className="text-right">
        <ButtonSecondary
          className="mr-4"
          disabled={submitting}
          onClick={onCancel}
        >
          Cancel
        </ButtonSecondary>
        <ButtonPrimary type="submit" disabled={submitting}>
          Submit
        </ButtonPrimary>
      </div>
    </form>
  )
}

export const actionOptions = {
  [ComAtprotoAdminDefs.ACKNOWLEDGE]: 'Acknowledge',
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
