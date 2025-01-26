'use client'

import { commands } from '@uiw/react-md-editor'
import dynamic from 'next/dynamic'
import { DocumentCheckIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

import { Checkbox, FormLabel, Input } from '@/common/forms'
import { ActionButton } from '@/common/buttons'
import { useCommunicationTemplateEditor } from './hooks'
import { LanguageSelectorDropdown } from '@/common/LanguagePicker'
import { useColorScheme } from '@/common/useColorScheme'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })

export const CommunicationTemplateForm = ({
  templateId,
}: {
  templateId?: string
}) => {
  const {
    nameFieldRef,
    subjectFieldRef,
    disableFieldRef,
    contentMarkdown,
    setContentMarkdown,
    onSubmit,
    isSaving,
  } = useCommunicationTemplateEditor(templateId)
  const [lang, setLang] = useState<string | undefined>()
  const { theme } = useColorScheme()

  return (
    <form onSubmit={onSubmit}>
      <FormLabel label="Language" htmlFor="lang" className="flex-1 mb-3">
        <input type="hidden" name="lang" value={lang} />
        <LanguageSelectorDropdown
          selectedLang={lang}
          setSelectedLang={setLang}
        />
      </FormLabel>
      <FormLabel label="Name" htmlFor="name" className="flex-1 mb-3">
        <Input
          type="text"
          id="name"
          name="name"
          required
          ref={nameFieldRef}
          placeholder="Name of the template"
          className="block w-full"
        />
      </FormLabel>
      <FormLabel label="Subject" htmlFor="subject" className="flex-1 mb-3">
        <Input
          type="text"
          id="subject"
          name="subject"
          required
          ref={subjectFieldRef}
          placeholder="Subject"
          className="block w-full"
        />
      </FormLabel>
      <FormLabel required label="Message" htmlFor="message" className="mb-3">
        <MDEditor
          preview="edit"
          height={400}
          value={contentMarkdown}
          onChange={(c) => setContentMarkdown(c || '')}
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
            disabled: isSaving,
          }}
        />
      </FormLabel>
      {templateId && (
        <Checkbox
          id="disabled"
          name="disabled"
          className="mb-3"
          ref={disableFieldRef}
          value="true"
          label="Disable template"
        />
      )}
      <ActionButton appearance="primary" type="submit" disabled={isSaving}>
        <DocumentCheckIcon className="h-4 w-4 mr-2" />
        {templateId ? 'Save' : 'Create'} Template
      </ActionButton>
    </form>
  )
}
