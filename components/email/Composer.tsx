import { PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { useRef, useState } from 'react'
import { toast } from 'react-toastify'

import { ActionButton } from '@/common/buttons'
import { FormLabel, Input, Select, Textarea } from '@/common/forms'
import client from '@/lib/client'
import { compileTemplateContent, getTemplate } from './helpers'
import { useRepoAndProfile } from '@/repositories/useRepoAndProfile'
import { EmailTemplates } from './templates'

export const EmailComposer = ({ did }: { did: string }) => {
  const [isSending, setIsSending] = useState(false)
  const messageField = useRef<HTMLTextAreaElement>(null)
  const subjectField = useRef<HTMLInputElement>(null)

  const { data: { repo } = {} } = useRepoAndProfile({ id: did })

  const onSubmit = async (e) => {
    e.preventDefault()
    setIsSending(true)
    const formData = new FormData(e.currentTarget)
    const subject = formData.get('subject')?.toString() ?? undefined
    const content = formData.get('message') as string

    try {
      await toast.promise(
        client.api.com.atproto.admin.sendEmail(
          { content, recipientDid: did, subject },
          { headers: client.adminHeaders(), encoding: 'application/json' },
        ),
        {
          pending: 'Sending email...',
          success: {
            render() {
              return 'Email sent to user'
            },
          },
          error: {
            render() {
              return 'Error sending email'
            },
          },
        },
      )
      // Reset the form if email is sent successfully
      e.target.reset()
      // On error, we are already showing a generic error message within the toast so
      // swallowing actual error here and resetting local state back afterwards
    } catch (err) {}

    setIsSending(false)
  }

  return (
    <form onSubmit={onSubmit}>
      <FormLabel label="Template" htmlFor="template" className="mb-3">
        <Select
          id="template"
          name="template"
          placeholder="Use from existing set of templates"
          className="block w-full"
          autoComplete="off"
          disabled={isSending}
          onChange={(e) => {
            // When templates are changed, force reset message
            const templateName = e.currentTarget.value
            const subject = getTemplate(templateName).subject
            const content = compileTemplateContent(templateName, {
              handle: repo?.handle,
            })
            if (messageField.current) messageField.current.value = content
            if (subjectField.current) subjectField.current.value = subject
          }}
        >
          {Object.keys(EmailTemplates).map((template) => (
            <option value={template} key={template}>
              {template}
            </option>
          ))}
        </Select>
      </FormLabel>
      <FormLabel label="Subject" htmlFor="subject" className="mb-3">
        <Input
          type="text"
          id="subject"
          name="subject"
          ref={subjectField}
          placeholder="Subject line for the email"
          className="block w-full"
          autoComplete="off"
        />
      </FormLabel>
      <FormLabel required label="Message" htmlFor="message" className="mb-3">
        <Textarea
          id="message"
          name="message"
          required
          rows={8}
          placeholder="Actual message to be sent to the user..."
          className="block w-full"
          autoComplete="off"
          ref={messageField}
          disabled={isSending}
        />
      </FormLabel>
      <ActionButton appearance="primary" type="submit" disabled={isSending}>
        <PaperAirplaneIcon className="h-4 w-4 mr-2" />
        Send
      </ActionButton>
    </form>
  )
}
