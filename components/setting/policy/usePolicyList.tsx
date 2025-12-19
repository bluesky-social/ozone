import { useLabelerAgent, useServerConfig } from '@/shell/ConfigurationContext'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PolicyListSetting, SeverityLevelConfig } from './types'
import { ToolsOzoneTeamDefs } from '@atproto/api'
import { toast } from 'react-toastify'
import { useState } from 'react'
import { nameToKey } from './utils'
import { MINUTE } from '@/lib/util'
import { getTrimmedInput } from '@/common/forms'

const PolicyListSettingKey = 'tools.ozone.setting.policyList'

export const usePolicyListSetting = () => {
  const labelerAgent = useLabelerAgent()
  return useQuery({
    queryKey: ['policy-list'],
    cacheTime: 10 * MINUTE,
    staleTime: 10 * MINUTE,
    queryFn: async () => {
      const { data } = await labelerAgent.tools.ozone.setting.listOptions({
        scope: 'instance',
        keys: [PolicyListSettingKey],
      })

      const policyListSetting = data.options.find(
        (option) => option.key === PolicyListSettingKey,
      )

      return policyListSetting
        ? {
            ...policyListSetting,
            value: policyListSetting.value as PolicyListSetting,
          }
        : null
    },
  })
}

export const usePolicyListEditor = () => {
  const queryClient = useQueryClient()
  const labelerAgent = useLabelerAgent()
  const { data: initialSetting } = usePolicyListSetting()
  const { role } = useServerConfig()
  const [removingPolicy, setRemovingPolicy] = useState('')

  const mutation = useMutation({
    mutationKey: ['policy-list-setting', 'upsert'],
    mutationFn: async (value: PolicyListSetting) => {
      await labelerAgent.tools.ozone.setting.upsertOption({
        value,
        scope: 'instance',
        key: PolicyListSettingKey,
        managerRole: ToolsOzoneTeamDefs.ROLEADMIN,
      })
    },

    onSuccess: () => {
      queryClient.invalidateQueries(['policy-list'])
      toast.success('Policy list updated')
    },

    onError: (error) => {
      toast.error(`Failed to update policy list: ${error?.['message']}`)
    },
  })

  const onSubmit = async (
    e,
    severityLevels?: Record<string, SeverityLevelConfig>,
    editingPolicyName?: string,
  ) => {
    const formData = new FormData(e.currentTarget)
    const name = getTrimmedInput(formData.get('name'))
    const description = getTrimmedInput(formData.get('description'))
    const url = getTrimmedInput(formData.get('url'))
    const emailSummary = getTrimmedInput(formData.get('emailSummary'))
    const emailBullets = getTrimmedInput(formData.get('emailBullets'))
    const emailExtraNotes = getTrimmedInput(formData.get('emailExtraNotes'))
    const emailNeedsContentDetails = formData.get('emailNeedsContentDetails') === 'true'

    const newSetting = { ...(initialSetting?.value ?? {}) }

    // If editing and name changed, remove old key
    if (editingPolicyName && editingPolicyName !== name) {
      delete newSetting[nameToKey(editingPolicyName)]
    }

    // Add/update policy with new/existing key
    newSetting[nameToKey(name)] = {
      name,
      description,
      ...(url && { url }),
      ...(emailSummary && { emailSummary }),
      ...(emailBullets && { emailBullets }),
      ...(emailExtraNotes && { emailExtraNotes }),
      emailNeedsContentDetails,
      ...(severityLevels &&
        Object.keys(severityLevels).length > 0 && { severityLevels }),
    }

    await mutation.mutateAsync(newSetting)
    // Form reset and editor close is handled in Editor component on success
  }

  const onRemove = async (name: string) => {
    const newSetting = {
      ...(initialSetting?.value ?? {}),
    }
    delete newSetting[nameToKey(name)]
    await mutation.mutateAsync(newSetting)
    setRemovingPolicy('')
  }

  return {
    mutation,
    onSubmit,
    removingPolicy,
    setRemovingPolicy,
    onRemove,
    canManagePolicies: role === ToolsOzoneTeamDefs.ROLEADMIN,
  }
}
