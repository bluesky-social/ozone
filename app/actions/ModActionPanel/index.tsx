import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { ComAtprotoAdminDefs } from '@atproto/api'
import { useEffect, useRef, useState } from 'react'
import { ShieldExclamationIcon } from '@heroicons/react/20/solid'
import { ActionPanel } from '@/common/ActionPanel'
import { ButtonPrimary, ButtonSecondary } from '@/common/buttons'
import { FormLabel, Input, Select, Textarea } from '@/common/forms'
import { RecordCard, RepoCard } from '@/common/RecordCard'
import { PropsOf } from '@/lib/types'
import { ResolutionList } from './ResolutionList'
import client from '@/lib/client'
import { BlobList } from './BlobList'
import {
  LabelsInput,
  diffLabels,
  toLabelVal,
  getLabelsForSubject,
} from '@/common/labels'
import { takesKeyboardEvt } from '@/lib/util'
import { SnoozeAction } from '@/reports/SnoozeAction'

const FORM_ID = 'mod-action-panel'

export function ModActionPanel(
  props: PropsOf<typeof ActionPanel> & {
    subject?: string
    subjectOptions?: string[]
    onSubmit: (vals: ModActionFormValues) => Promise<void>
    onSnooze?: (vals: { snoozeDuration: number; subject: string }) => void
  },
) {
  const { subject, subjectOptions, onSubmit, onClose, onSnooze, ...others } =
    props
  return (
    <ActionPanel title="Take moderation action" onClose={onClose} {...others}>
      <Form
        onCancel={onClose}
        onSubmit={onSubmit}
        subject={subject}
        subjectOptions={subjectOptions}
        onSnooze={onSnooze}
      />
    </ActionPanel>
  )
}

function Form(props: {
  subject?: string
  subjectOptions?: string[]
  onCancel: () => void
  onSubmit: (vals: ModActionFormValues) => Promise<void>
  onSnooze?: (vals: { snoozeDuration: number; subject: string }) => void
}) {
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
  useEffect(() => {
    setReplacingAction(false)
    setAction(ComAtprotoAdminDefs.ACKNOWLEDGE)
  }, [subject])
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

  const { currentAction: currActionMaybeReplace = currentActionFallback } =
    record?.moderation ?? repo?.moderation ?? {}
  const currentAction = replacingAction ? undefined : currActionMaybeReplace
  const allLabels = getLabelsForSubject({ repo, record })
  const currentLabels = allLabels.map((label) =>
    toLabelVal(label, repo?.did ?? record?.repo.did),
  )
  const actionColorClasses =
    currActionMaybeReplace?.action === ComAtprotoAdminDefs.TAKEDOWN
      ? 'text-rose-600 hover:text-rose-700'
      : 'text-indigo-600 hover:text-indigo-900'
  const displayActionType = currActionMaybeReplace?.action.replace(
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
      <FormLabel
        label="Action"
        htmlFor="action"
        className={`mb-3 ${currentAction ? 'opacity-75' : ''}`}
      >
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
      <FormLabel
        label="Labels"
        className={`mb-3 ${currentAction ? 'opacity-75' : ''}`}
      >
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
      <FormLabel
        label="Resolves"
        className={`mb-6 ${currentAction ? 'opacity-75' : ''}`}
      >
        <ResolutionList subject={subject || null} name="resolveReportIds" />
      </FormLabel>
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
      <div className="flex flex-row justify-between">
        {subject && onSnooze ? (
          <SnoozeAction
            panelClassName="-translate-y-full -top-1 pb-1 -left-1"
            onConfirm={(snoozeDuration) => {
              onSnooze({ snoozeDuration, subject })
              onCancel()
            }}
          />
        ) : (
          // Placeholder to ensure the primary action buttons are always aligned on the right
          <div />
        )}
        <div className="flex flex-row justify-end">
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
