import { useQuery } from '@tanstack/react-query'

import client from '@/lib/client'
import { queryClient } from 'components/QueryClient'
import { toast } from 'react-toastify'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export const useCommunicationTemplateList = ({
  enabled = true,
}: {
  enabled?: boolean
}) => {
  return useQuery({
    queryKey: ['communicationTemplateList'],
    enabled,
    // We don't expect these to change often, so we can cache them for a while
    // When templates are updated/created, we manually invalidate the query so fresh data is always available
    cacheTime: 60 * 60 * 1000,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data } =
        await client.api.com.atproto.admin.listCommunicationTemplates(
          {},
          { headers: client.adminHeaders() },
        )
      return data.communicationTemplates
    },
  })
}

export const useCommunicationTemplateEditor = (templateId?: string) => {
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
  const { data } = useCommunicationTemplateList({ enabled: !!templateId })

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

  const saveFunc = ({
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
      ? client.api.com.atproto.admin.updateCommunicationTemplate(
          {
            id: `${templateId}`,
            contentMarkdown,
            subject,
            name,
            disabled,
            updatedBy: client.session.did,
          },
          { headers: client.adminHeaders(), encoding: 'application/json' },
        )
      : client.api.com.atproto.admin.createCommunicationTemplate(
          {
            contentMarkdown,
            subject,
            name,
            createdBy: client.session.did,
          },
          { headers: client.adminHeaders(), encoding: 'application/json' },
        )

  const onSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = formData.get('name')?.toString() ?? ''
    const subject = formData.get('subject')?.toString() ?? ''
    const disabled = formData.get('disabled') === 'true'

    setIsSaving(true)
    try {
      await toast.promise(saveFunc({ contentMarkdown, name, subject, disabled }), {
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
      })
      // Reset the form if email is sent successfully
      e.target.reset()
      setContentMarkdown('')
      queryClient.invalidateQueries({
        queryKey: ['communicationTemplateList'],
      })
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
