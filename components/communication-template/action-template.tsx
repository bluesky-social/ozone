import { useState } from 'react'
import { useLabelerAgent, useServerConfig } from '@/shell/ConfigurationContext'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ToolsOzoneTeamDefs } from '@atproto/api'
import { toast } from 'react-toastify'
import { ActionButton } from '@/common/buttons'
import { FormLabel } from '@/common/forms'
import { TemplateSelector } from '@/email/template-selector'
import { useCommunicationTemplateList } from './hooks'
import { Card } from '@/common/Card'
import Link from 'next/link'
import { Alert } from '@/common/Alert'

const ActionCommunicationTemplatesKey =
  'tools.ozone.setting.action.communicationTemplates'

//  Contains map of action template name and id of the template
type ActionCommunicationTemplatesValue = Record<string, string>

export const useActionCommunicationTemplates = () => {
  const labelerAgent = useLabelerAgent()
  return useQuery({
    queryKey: ['action-communication-templates'],
    queryFn: async () => {
      const {
        data: { options },
      } = await labelerAgent.tools.ozone.setting.listOptions({
        scope: 'instance',
        keys: [ActionCommunicationTemplatesKey],
      })

      return options[0]
        ? (options[0].value as ActionCommunicationTemplatesValue)
        : {}
    },
  })
}

export const useActionCommunicationTemplatesMutation = () => {
  const queryClient = useQueryClient()
  const labelerAgent = useLabelerAgent()

  return useMutation({
    mutationKey: ['action-communication-templates', 'upsert'],
    mutationFn: async (value: ActionCommunicationTemplatesValue) => {
      await labelerAgent.tools.ozone.setting.upsertOption({
        value,
        scope: 'instance',
        key: ActionCommunicationTemplatesKey,
        managerRole: ToolsOzoneTeamDefs.ROLEADMIN,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['action-communication-templates'])
      toast.success('Action templates updated successfully')
    },
    onError: (error: any) => {
      toast.error(
        `Failed to update action templates: ${
          error?.message || 'Unknown error'
        }`,
      )
    },
  })
}

const Container = ({ children }: { children: React.ReactNode }) => {
  return (
    <div id="action-template-config">
      <div className="flex flex-row justify-between my-4">
        <h4 className="font-medium text-gray-700 dark:text-gray-100">
          Action Templates
        </h4>
      </div>
      <Card className="mb-4 pb-4">
        <div className="p-2">{children}</div>
      </Card>
    </div>
  )
}

export const ActionTemplateConfig = () => {
  const { role } = useServerConfig()
  const canManageTemplates = role === ToolsOzoneTeamDefs.ROLEADMIN
  const { data: communicationTemplates } = useCommunicationTemplateList({})
  const { data: actionTemplatesSetting } = useActionCommunicationTemplates()
  const { mutate: updateActionTemplates, isLoading } =
    useActionCommunicationTemplatesMutation()

  const [selectedTemplate, setSelectedTemplate] = useState<string>('')

  const currentRevokeCredentialsTemplateId =
    actionTemplatesSetting?.revokeCredentials

  const handleSave = () => {
    if (isLoading) return
    const selectedTemplateData = communicationTemplates?.find(
      (template) => template.name === selectedTemplate,
    )

    if (!selectedTemplateData) {
      toast.error(`Selected template #${selectedTemplate} not found`)
      return
    }

    const updatedValue = {
      ...(actionTemplatesSetting || {}),
      revokeCredentials: selectedTemplateData.id,
    }

    updateActionTemplates(updatedValue)
  }

  const getCurrentTemplateName = () => {
    if (!currentRevokeCredentialsTemplateId || !communicationTemplates)
      return null
    return communicationTemplates.find(
      (template) => template.id === currentRevokeCredentialsTemplateId,
    )?.name
  }

  if (!canManageTemplates) {
    return (
      <Container>
        You do not have permission to manage action templates.
      </Container>
    )
  }

  return (
    <Container>
      <p className="text-sm pb-1 mb-2 border-b border-300 dark:border-gray-700">
        Configure which communication templates should be used for specific
        moderation actions.
      </p>

      {currentRevokeCredentialsTemplateId && (
        <p className="text-sm pb-2">
          Currently configured:{' '}
          <Link
            className="underline font-bold"
            href={`/communication-template/${currentRevokeCredentialsTemplateId}/edit`}
          >
            {getCurrentTemplateName()}
          </Link>
        </p>
      )}

      {!!communicationTemplates?.length ? (
        <div className="space-y-4">
          <FormLabel
            label="Revoke Credentials Template"
            htmlFor="template"
            className="mb-3"
          >
            <TemplateSelector
              communicationTemplates={communicationTemplates}
              onSelect={setSelectedTemplate}
            />
          </FormLabel>

          <p className="text-sm dark:text-gray-300 text-gray-700">
            {"Don't"} have a template for this already?{' '}
            <Link className="underline" href="/communication-template/create">
              Create one here.
            </Link>
          </p>

          <div className="flex flex-row justify-end">
            <ActionButton
              size="sm"
              appearance="primary"
              disabled={isLoading}
              onClick={!isLoading ? handleSave : undefined}
            >
              {isLoading ? 'Saving...' : 'Save Setting'}
            </ActionButton>
          </div>
        </div>
      ) : (
        <Alert
          type="warning"
          body={
            <>
              No email templates found.{' '}
              <Link href="/communication-template/create" className="underline">
                Create New Template
              </Link>
            </>
          }
        />
      )}
    </Container>
  )
}
