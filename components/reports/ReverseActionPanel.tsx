import { useState } from 'react'
import { ComAtprotoReportReasonType } from '@atproto/api'
import { ActionPanel } from '../common/ActionPanel'
import { ButtonPrimary, ButtonSecondary } from '../common/buttons'
import { FormLabel, Input, Select, Textarea } from '../common/forms'
import { RecordCard, RepoCard } from '../common/RecordCard'
import { PropsOf } from '../../lib/types'

export function ReverseActionPanel(
  props: PropsOf<typeof ActionPanel> & {
    subject: string
    onSubmit: (vals: ReportFormValues) => Promise<void>
  },
) {
  const { subject, onSubmit, onClose, ...others } = props
  return (
    <ActionPanel title="Reverse Action" onClose={onClose} {...others}>
      <Form onCancel={onClose} onSubmit={onSubmit} subject={subject} />
    </ActionPanel>
  )
}

function Form(props: {
  subject: string
  onCancel: () => void
  onSubmit: (vals: ReportFormValues) => Promise<void>
}) {
  const { subject, onCancel, onSubmit, ...others } = props
  const [submitting, setSubmitting] = useState(false)
  return (
    <form
      onSubmit={async (ev) => {
        ev.preventDefault()
        try {
          setSubmitting(true)
          const formData = new FormData(ev.currentTarget)
          await onSubmit({
            reason: formData.get('reason')!.toString() || undefined,
          })
          onCancel() // Close
        } finally {
          setSubmitting(false)
        }
      }}
      {...others}
    >
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

      <Textarea
        name="reason"
        placeholder="Details"
        className="block w-full mb-3"
        required
      />
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

export type ReportFormValues = {
  reason?: string
}
