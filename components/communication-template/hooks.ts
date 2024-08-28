import { useQuery } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLabelerAgent } from '@/shell/ConfigurationContext'

export const useCommunicationTemplateList = ({
  enabled = true,
}: {
  enabled?: boolean
} = {}) => {
  const labelerAgent = useLabelerAgent()

  return useQuery({
    queryKey: ['communicationTemplateList'],
    enabled,
    // We don't expect these to change often, so we can cache them for a while
    // When templates are updated/created, we manually invalidate the query so fresh data is always available
    cacheTime: 60 * 60 * 1000,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data } =
        await labelerAgent.api.tools.ozone.communication.listTemplates()
      return data.communicationTemplates
    },
  })
}

export const useCommunicationTemplateEditor = (templateId?: string) => {
  const labelerAgent = useLabelerAgent()

  const [contentMarkdown, setContentMarkdown] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // These are used to set the initial values of the form when editing an existing template
  // We could also use states for these but feels more natural to let the browser control the form fields
  const nameFieldRef = useRef<HTMLInputElement>(null)
  const subjectFieldRef = useRef<HTMLInputElement>(null)
  const disableFieldRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  // Enable the query when we have a templateId, otherwise, it means the hook is being mounted on the create page
  // where we don't need to load any existing template
  const { data, refetch } = useCommunicationTemplateList({
    enabled: !!templateId,
  })

  useEffect(() => {
    if (templateId && data?.length) {
      const template = data.find((t) => t.id === templateId)
      if (template) {
        setContentMarkdown(template.contentMarkdown)
        if (nameFieldRef.current) {
          nameFieldRef.current.value = template.name
        }
        if (subjectFieldRef.current && template.subject) {
          subjectFieldRef.current.value = template.subject
        }
        if (disableFieldRef.current) {
          disableFieldRef.current.checked = template.disabled
        }
      }
    }
  }, [templateId, data])

  const saveFunc = useCallback(
    async ({
      contentMarkdown,
      name,
      subject,
      disabled,
    }: {
      contentMarkdown: string
      name: string
      subject: string
      disabled: boolean
    }) =>
      templateId
        ? labelerAgent.api.tools.ozone.communication.updateTemplate({
            id: `${templateId}`,
            contentMarkdown,
            subject,
            name,
            disabled,
            updatedBy: labelerAgent.assertDid,
          })
        : labelerAgent.api.tools.ozone.communication.createTemplate({
            contentMarkdown,
            subject,
            name,
            createdBy: labelerAgent.assertDid,
          }),
    [labelerAgent, templateId],
  )

  const onSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = formData.get('name')?.toString() ?? ''
    const subject = formData.get('subject')?.toString() ?? ''
    const disabled = formData.get('disabled') === 'true'

    setIsSaving(true)
    try {
      await toast.promise(
        saveFunc({ contentMarkdown, name, subject, disabled }),
        {
          pending: 'Saving template...',
          success: {
            render() {
              return 'Template saved successfully'
            },
          },
          error: {
            render() {
              return 'Error saving template'
            },
          },
        },
      )
      // Reset the form if email is sent successfully
      e.target.reset()
      setContentMarkdown('')
      refetch()
      router.push('/communication-template')
      // On error, we are already showing a generic error message within the toast so
      // swallowing actual error here and resetting local state back afterwards
    } catch (err) {}

    setIsSaving(false)
  }

  return {
    onSubmit,
    setContentMarkdown,
    contentMarkdown,
    isSaving,
    nameFieldRef,
    subjectFieldRef,
    disableFieldRef,
  }
}
