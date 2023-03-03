import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { ComAtprotoAdminModerationAction as ModAction } from '@atproto/api'
import { useState } from 'react'
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
import { ShieldExclamationIcon } from '@heroicons/react/20/solid'
import { BlobList } from './BlobList'

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
  const { data: { record, repo } = {} } = useQuery({
    queryKey: ['modActionSubject', { subject }],
    queryFn: () => getSubject(subject),
  })
  const { currentAction } = record?.moderation ?? repo?.moderation ?? {}
  const actionColorClasses =
    currentAction?.action === ModAction.TAKEDOWN
      ? 'text-rose-600 hover:text-rose-700'
      : 'text-indigo-600 hover:text-indigo-900'
  const displayActionType = currentAction?.action.replace(
    'com.atproto.admin.moderationAction#',
    '',
  )
  return (
    <form
      onSubmit={async (ev) => {
        ev.preventDefault()
        try {
          setSubmitting(true)
          const formData = new FormData(ev.currentTarget)
          await onSubmit({
            subject: formData.get('subject')!.toString(),
            action: formData.get('action')!.toString(),
            reason: formData.get('reason')!.toString(),
            resolveReportIds: formData
              .getAll('resolveReportIds')
              .map((id) => Number(id)),
            subjectBlobCids: formData
              .getAll('subjectBlobCids')
              .map((cid) => String(cid)),
          })
          onCancel() // Close
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
      {!currentAction && (
        <>
          {record?.blobs && (
            <FormLabel label="Blobs" className="mb-3">
              <BlobList blobs={record.blobs} name="subjectBlobCids" />
            </FormLabel>
          )}
          <FormLabel label="Action" htmlFor="action" className="mb-3">
            <Select id="action" name="action" required>
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
          <Textarea
            name="reason"
            required
            placeholder="Details"
            className="block w-full mb-3"
          />
          <FormLabel label="Resolves" className="mb-6">
            <ResolutionList subject={subject || null} name="resolveReportIds" />
          </FormLabel>
        </>
      )}
      <div className="text-right">
        <ButtonSecondary
          className="mr-4"
          disabled={submitting}
          onClick={onCancel}
        >
          Cancel
        </ButtonSecondary>
        <ButtonPrimary type="submit" disabled={!!currentAction || submitting}>
          Submit
        </ButtonPrimary>
      </div>
    </form>
  )
}

export const actionOptions = {
  [ModAction.ACKNOWLEDGE]: 'Acknowledge',
  [ModAction.FLAG]: 'Flag',
  [ModAction.TAKEDOWN]: 'Takedown',
}

export type ModActionFormValues = {
  subject: string
  action: string
  reason: string
  resolveReportIds: number[]
  subjectBlobCids: string[]
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
