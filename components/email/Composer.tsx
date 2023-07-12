import { PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { useRef, useState } from 'react'
import { toast } from 'react-toastify'

import { ActionButton } from '@/common/buttons'
import { FormLabel, Input, Select, Textarea } from '@/common/forms'
import client from '@/lib/client'
import {
  compileTemplate,
  TemplateNames,
  Templates,
} from './helpers'

export const EmailComposer = ({ did }: { did: string }) => {
  const [isSending, setIsSending] = useState(false)
  const messageField = useRef<HTMLTextAreaElement>(null)

  const onSubmit = async (e) => {
    e.preventDefault()
    setIsSending(true)
    const formData = new FormData(e.currentTarget)
    const topic = formData.get('topic')
    const subject = formData.get('subject')?.toString() ?? undefined
    const message = formData.get('message') as string
    const templateName = formData.get('template')
    const content = compileTemplate(templateName as Templates, { message })

    await toast.promise(
      client.api.com.atproto.admin.sendEmail(
        { content, recipientDid: did, subject },
        { headers: client.adminHeaders(), encoding: 'application/json' },
      ),
      {
        pending: 'Sending email...',
        success: {
          render() {
            // TODO: better success message?
            return 'Email sent to user'
          },
        },
        error: {
          render({ data }: any) {
            // TODO: better error?
            return 'Error sending email'
          },
        },
      },
    )

    setIsSending(false)
  }

  return (
    <form onSubmit={onSubmit}>
      <FormLabel label="Topic" htmlFor="topic" className="mb-3">
        <Input
          type="text"
          id="topic"
          name="topic"
          placeholder="Post url or user DID"
          className="block w-full"
          autoComplete="off"
        />
      </FormLabel>
      <FormLabel label="Template" htmlFor="template" className="mb-3">
        <Select
          id="template"
          name="template"
          placeholder="Use from existing set of templates"
          className="block w-full"
          autoComplete="off"
          disabled={isSending}
          onChange={() => {
            // When templates are changed, force reset message
            if (messageField.current) messageField.current.value = ''
          }}
        >
          {Object.values(Templates).map((template) => (
            <option value={template} key={template}>
              {TemplateNames[template]}
            </option>
          ))}
        </Select>
      </FormLabel>
      <FormLabel label="Subject" htmlFor="subject" className="mb-3">
        <Input
          type="text"
          id="subject"
          name="subject"
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
