import { PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { useRef, useState } from 'react'
import { toast } from 'react-toastify'

import { ActionButton } from '@/common/buttons'
import { Checkbox, FormLabel, Input, Select, Textarea } from '@/common/forms'
import client from '@/lib/client'
import { compileTemplateContent, getTemplate } from './helpers'
import { useRepoAndProfile } from '@/repositories/useRepoAndProfile'
import { EmailTemplates } from './templates'
import { useEmailComposer } from './useComposer'

export const EmailComposer = ({ did }: { did: string }) => {
  const {
    isSending,
    requiresConfirmation,
    isConfirmed,
    checkContent,
    toggleConfirmation,
    toggleSending,
    reset,
  } = useEmailComposer()
  const messageField = useRef<HTMLTextAreaElement>(null)
  const subjectField = useRef<HTMLInputElement>(null)

  const { data: { repo } = {} } = useRepoAndProfile({ id: did })

  const onSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const subject = formData.get('subject')?.toString() ?? undefined
    const content = formData.get('message') as string

    toggleSending(true)
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
      reset()
      // On error, we are already showing a generic error message within the toast so
      // swallowing actual error here and resetting local state back afterwards
    } catch (err) {}

    toggleSending(false)
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
            if (messageField.current) {
              messageField.current.value = content
              checkContent(content)
            }
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
          onChange={(e) => {
            checkContent(e.currentTarget.value)
          }}
          disabled={isSending}
        />
      </FormLabel>
      {requiresConfirmation && (
        <Checkbox
          required
          id="confirm"
          name="confirm"
          className="mb-3"
          checked={isConfirmed}
          onChange={() => {
            toggleConfirmation()
          }}
          label="There may be placeholder texts in the content of the email that are meant to be replaced with actual content, please check this box if you're sure you want to send the email as is"
        />
      )}
      <ActionButton
        appearance="primary"
        type="submit"
        disabled={isSending || (requiresConfirmation && !isConfirmed)}
      >
        <PaperAirplaneIcon className="h-4 w-4 mr-2" />
        Send
      </ActionButton>
    </form>
  )
}
