import { ComAtprotoAdminModerationAction } from '@atproto/api'
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

export function ModActionPanel(
  props: PropsOf<typeof ActionPanel> & {
    subjectOptions: string[]
    onSubmit: (vals: ModActionFormValues) => Promise<void>
  },
) {
  const { subjectOptions, onSubmit, onClose, ...others } = props
  return (
    <ActionPanel title="Take moderation action" onClose={onClose} {...others}>
      <Form
        onCancel={onClose}
        onSubmit={onSubmit}
        subjectOptions={subjectOptions}
      />
    </ActionPanel>
  )
}

function Form(props: {
  subjectOptions: string[]
  onCancel: () => void
  onSubmit: (vals: ModActionFormValues) => Promise<void>
}) {
  const { subjectOptions, onCancel, onSubmit, ...others } = props
  const [subject, setSubject] = useState('')
  const [submitting, setSubmitting] = useState(false)
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
          list="subject-suggestions"
          placeholder="Subject"
          className="block w-full"
          value={subject}
          onChange={(ev) => setSubject(ev.target.value)}
          autoComplete="off"
        />
        <datalist id="subject-suggestions">
          {subjectOptions.map((subject) => (
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

const actionOptions = {
  [ComAtprotoAdminModerationAction.ACKNOWLEDGE]: 'Acknowledge',
  [ComAtprotoAdminModerationAction.FLAG]: 'Flag',
  [ComAtprotoAdminModerationAction.TAKEDOWN]: 'Takedown',
}

export type ModActionFormValues = {
  subject: string
  action: string
  reason: string
  resolveReportIds: number[]
}
