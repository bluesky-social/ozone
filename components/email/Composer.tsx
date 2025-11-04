import { PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { commands } from '@uiw/react-md-editor'
import { RefObject, useRef } from 'react'
import { toast } from 'react-toastify'
import dynamic from 'next/dynamic'

import { ActionButton } from '@/common/buttons'
import { Checkbox, FormLabel, Input, Textarea } from '@/common/forms'
import { useColorScheme } from '@/common/useColorScheme'
import { MOD_EVENTS } from '@/mod-event/constants'
import { useRepoAndProfile } from '@/repositories/useRepoAndProfile'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import {
  compileTemplateContent,
  EmailComposerData,
  getTemplate,
} from './helpers'
import { TemplateSelector } from './template-selector'
import { availableLanguageCodes } from '@/common/LanguagePicker'
import {
  ToolsOzoneCommunicationDefs,
  ToolsOzoneModerationDefs,
} from '@atproto/api'
import { useEmailComposer } from './useComposer'
import {
  ActionPanelNames,
  hydrateModToolInfo,
} from '@/mod-event/helpers/emitEvent'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })

type RecipientLanguages = {
  languages: string[]
  defaultLang?: string
}

export const getRecipientsLanguages = (
  repo?: ToolsOzoneModerationDefs.RepoViewDetail,
): RecipientLanguages => {
  if (!repo) {
    return { languages: [], defaultLang: undefined }
  }
  // If the recipient account is tagged with multiple languages, we can use that to pre-select the non-english language
  const recipientsLanguageTags =
    repo.moderation.subjectStatus?.tags
      ?.filter((tag) => {
        // there may be non-lang related tags and lang:und is set when we couldn't figure out the language
        // this account associates with so no need to consider them
        if (!tag.startsWith('lang:') || tag === 'lang:und') {
          return false
        }
        return true
      })
      .map((tag) => tag.replace('lang:', '')) ?? []

  // find out among the accepted languages, if there is any non-english one so that we can default to that
  const nonEnglishLang = recipientsLanguageTags.find((lang) => {
    return lang !== 'en' && availableLanguageCodes.includes(lang)
  })

  if (nonEnglishLang) {
    return { defaultLang: nonEnglishLang, languages: recipientsLanguageTags }
  }
  return {
    defaultLang: recipientsLanguageTags[0],
    languages: recipientsLanguageTags,
  }
}

export const EmailComposer = ({
  did,
  replacePlaceholders = true,
  handleSubmit,
}: {
  did?: string
  replacePlaceholders?: boolean
  handleSubmit?: (emailData: EmailComposerData) => Promise<void>
}) => {
  const labelerAgent = useLabelerAgent()
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
  const recipientLanguages = getRecipientsLanguages(repo)
  let templateLabel = `Template`
  if (recipientLanguages.languages.length > 1) {
    templateLabel = `Template (account languages: ${recipientLanguages.languages.join(
      ', ',
    )})`
  }
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

      const event = {
        $type: MOD_EVENTS.EMAIL,
        comment,
        subjectLine: subject,
        content: htmlContent,
      }
      if (handleSubmit) {
        await handleSubmit(event)
      } else {
        await toast.promise(
          labelerAgent.tools.ozone.moderation.emitEvent(
            hydrateModToolInfo(
              {
                event,
                createdBy: labelerAgent.assertDid,
                subject: { $type: 'com.atproto.admin.defs#repoRef', did },
              },
              ActionPanelNames.EmailComposer,
            ),
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
      }

      // Reset the form if email is sent successfully
      e.target.reset()
      reset()
      // On error, we are already showing a generic error message within the toast so
      // swallowing actual error here and resetting local state back afterwards
    } catch (err) {}

    toggleSending(false)
  }

  const onTemplateSelect = (templateName: string) => {
    // When templates are changed, force reset message
    const template =
      getTemplate(templateName, communicationTemplates || []) ||
      communicationTemplates?.[0]
    if (!template) {
      return
    }
    const subject = template.subject || ''
    // When email is sent to one recipient at a time, we know how to replace the placeholders
    // based on the individual recipient's data on hand. However, when sending it to bulk recipients
    // we only know those details at send time so replacing them in the editor doesn't really work
    const content = compileTemplateContent(
      template.contentMarkdown,
      replacePlaceholders
        ? {
            handle: repo?.handle,
          }
        : {},
    )
    setContent(content)
    if (subjectField.current) subjectField.current.value = subject
    if (commentField.current)
      commentField.current.value = `Sent via ozone template: ${templateName}.`
  }

  return (
    <form onSubmit={onSubmit}>
      <EmailComposerFields
        templateLabel={templateLabel}
        communicationTemplates={communicationTemplates}
        onTemplateSelect={onTemplateSelect}
        recipientLanguages={recipientLanguages}
        subjectField={subjectField}
        content={content}
        setContent={setContent}
        theme={theme}
        isSending={isSending}
        requiresConfirmation={requiresConfirmation}
        isConfirmed={isConfirmed}
        toggleConfirmation={toggleConfirmation}
      />
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

export const EmailComposerFields = ({
  templateLabel,
  communicationTemplates,
  onTemplateSelect,
  recipientLanguages,
  subjectField,
  content,
  setContent,
  theme,
  isSending,
  requiresConfirmation,
  isConfirmed,
  toggleConfirmation,
}: {
  templateLabel: string
  communicationTemplates?: ToolsOzoneCommunicationDefs.TemplateView[]
  onTemplateSelect: (templateName: string) => void
  recipientLanguages: RecipientLanguages
  subjectField: RefObject<HTMLInputElement | null>
  content: string
  setContent: (content: string) => void
  theme: 'light' | 'dark'
  isSending: boolean
  requiresConfirmation: boolean
  isConfirmed: boolean
  toggleConfirmation: () => void
}) => {
  return (
    <>
      <FormLabel label={templateLabel} htmlFor="template" className="mb-3">
        <TemplateSelector
          communicationTemplates={communicationTemplates}
          onSelect={onTemplateSelect}
          defaultLang={recipientLanguages.defaultLang}
        />
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
          onChange={(c) => setContent(c)}
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
    </>
  )
}
