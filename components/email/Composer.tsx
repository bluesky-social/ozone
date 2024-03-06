import { PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { commands } from '@uiw/react-md-editor'
import { useRef } from 'react'
import { toast } from 'react-toastify'
import dynamic from 'next/dynamic'

import { ActionButton } from '@/common/buttons'
import { Checkbox, FormLabel, Input, Select, Textarea } from '@/common/forms'
import client from '@/lib/client'
import { compileTemplateContent, getTemplate } from './helpers'
import { useRepoAndProfile } from '@/repositories/useRepoAndProfile'
import { useEmailComposer } from './useComposer'
import { useColorScheme } from '@/common/useColorScheme'
import { MOD_EVENTS } from '@/mod-event/constants'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })

export const EmailComposer = ({ did }: { did: string }) => {
  const {
    isSending,
    requiresConfirmation,
    isConfirmed,
    toggleConfirmation,
    toggleSending,
    reset,
    content,
    setContent,
    communicationTemplates,
  } = useEmailComposer()
  const { theme } = useColorScheme()
  const subjectField = useRef<HTMLInputElement>(null)
  const commentField = useRef<HTMLTextAreaElement>(null)

  const { data: { repo } = {} } = useRepoAndProfile({ id: did })

  const onSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const subject = formData.get('subject')?.toString() ?? undefined
    const comment = formData.get('comment')?.toString() ?? undefined

    toggleSending(true)
    try {
      const [{ remark }, { default: remarkHtml }] = await Promise.all([
        import('remark'),
        import('remark-html'),
      ])
      const htmlContent = remark()
        .use(remarkHtml)
        .processSync(content)
        .toString()

      await toast.promise(
        client.api.com.atproto.admin.emitModerationEvent(
          {
            event: {
              $type: MOD_EVENTS.EMAIL,
              comment,
              subjectLine: subject,
              content: htmlContent,
            },
            subject: { $type: 'com.atproto.admin.defs#repoRef', did },
            createdBy: client.session.did,
          },
          { headers: client.proxyHeaders(), encoding: 'application/json' },
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
            const template =
              getTemplate(templateName, communicationTemplates || []) ||
              communicationTemplates?.[0]
            if (!template) {
              return
            }
            const subject = template.subject || ''
            const content = compileTemplateContent(template.contentMarkdown, {
              handle: repo?.handle,
            })
            setContent(content)
            if (subjectField.current) subjectField.current.value = subject
            if (commentField.current)
              commentField.current.value = `Sent via ozone template: ${templateName}.`
          }}
        >
          {communicationTemplates
            ?.filter((tpl) => !tpl.disabled)
            .map((template) => (
              <option value={template.name} key={template.id}>
                {template.name}
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
        <MDEditor
          preview="edit"
          height={400}
          value={content}
          onChange={setContent}
          fullscreen={false}
          data-color-mode={theme}
          commands={[
            commands.bold,
            commands.divider,
            commands.hr,
            commands.italic,
            commands.link,
            commands.orderedListCommand,
            commands.unorderedListCommand,
            commands.quote,
            commands.strikethrough,
            commands.title1,
            commands.title2,
            commands.title3,
          ]}
          extraCommands={[commands.codeEdit, commands.codeLive]}
          textareaProps={{
            disabled: isSending,
          }}
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
      <FormLabel label="Additional Comment" htmlFor="comment" className="mb-3">
        <Textarea
          name="comment"
          ref={commentField}
          className="block w-full mb-3"
        />
      </FormLabel>
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
