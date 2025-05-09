import { useLabelerAgent, useServerConfig } from '@/shell/ConfigurationContext'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PolicyListSetting } from './types'
import { ToolsOzoneTeamDefs } from '@atproto/api'
import { toast } from 'react-toastify'
import { useState } from 'react'

const PolicyListSettingKey = 'tools.ozone.setting.policyList'
const nameToKey = (name: string) => name.toLowerCase().replace(/\s/g, '-')

export const usePolicyListSetting = () => {
  const labelerAgent = useLabelerAgent()
  return useQuery({
    queryKey: ['setting-policy-list'],
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

  const onSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = formData.get('name')?.toString().trim() ?? ''
    const description = formData.get('description')?.toString().trim() ?? ''
    const newSetting = {
      ...(initialSetting?.value ?? {}),
      [nameToKey(name)]: {
        name,
        description,
      },
    }
    await mutation.mutateAsync(newSetting)
    e.currentTarget.reset()
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
