import { useLabelerAgent, useServerConfig } from '@/shell/ConfigurationContext'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SeverityLevelListSetting } from './types'
import { ToolsOzoneTeamDefs } from '@atproto/api'
import { toast } from 'react-toastify'
import { useState } from 'react'
import { nameToKey } from '../policy/utils'
import { MINUTE } from '@/lib/util'
import { getTrimmedInput } from '@/common/forms'

const SeverityLevelSettingKey = 'tools.ozone.setting.severityLevels'

export const useSeverityLevelSetting = () => {
  const labelerAgent = useLabelerAgent()
  return useQuery({
    queryKey: ['severity-level'],
    // Set a high cache time since severity levels change infrequently but we read this value very frequently
    cacheTime: 10 * MINUTE,
    queryFn: async () => {
      const { data } = await labelerAgent.tools.ozone.setting.listOptions({
        scope: 'instance',
        keys: [SeverityLevelSettingKey],
      })

      const severityLevelSetting = data.options.find(
        (option) => option.key === SeverityLevelSettingKey,
      )

      return severityLevelSetting
        ? {
            ...severityLevelSetting,
            value: severityLevelSetting.value as SeverityLevelListSetting,
          }
        : null
    },
  })
}

export const useSeverityLevelEditor = () => {
  const queryClient = useQueryClient()
  const labelerAgent = useLabelerAgent()
  const { data: initialSetting } = useSeverityLevelSetting()
  const { role } = useServerConfig()
  const [removingSeverityLevel, setRemovingSeverityLevel] = useState('')

  const mutation = useMutation({
    mutationKey: ['severity-level-setting', 'upsert'],
    mutationFn: async (value: SeverityLevelListSetting) => {
      await labelerAgent.tools.ozone.setting.upsertOption({
        value,
        scope: 'instance',
        key: SeverityLevelSettingKey,
        managerRole: ToolsOzoneTeamDefs.ROLEADMIN,
      })
    },

    onSuccess: () => {
      queryClient.invalidateQueries(['severity-level'])
      toast.success('Severity level list updated')
    },

    onError: (error) => {
      toast.error(`Failed to update severity level list: ${error?.['message']}`)
    },
  })

  const onSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = getTrimmedInput(formData.get('name'))
    const description = getTrimmedInput(formData.get('description'))
    const strikeCountStr = getTrimmedInput(formData.get('strikeCount'))
    const strikeOnOccurrenceStr = getTrimmedInput(
      formData.get('strikeOnOccurrence'),
    )
    const expiryInDaysStr = getTrimmedInput(formData.get('expiryInDays'))
    const needsTakedown = formData.get('needsTakedown') === 'true'

    const newSetting = {
      ...(initialSetting?.value ?? {}),
      [nameToKey(name)]: {
        name,
        description,
        ...(strikeCountStr && { strikeCount: parseInt(strikeCountStr, 10) }),
        ...(strikeOnOccurrenceStr && {
          strikeOnOccurrence: parseInt(strikeOnOccurrenceStr, 10),
        }),
        ...(expiryInDaysStr && { expiryInDays: parseInt(expiryInDaysStr, 10) }),
        needsTakedown,
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
    setRemovingSeverityLevel('')
  }

  return {
    mutation,
    onSubmit,
    removingSeverityLevel,
    setRemovingSeverityLevel,
    onRemove,
    canManageSeverityLevels: role === ToolsOzoneTeamDefs.ROLEADMIN,
  }
}
