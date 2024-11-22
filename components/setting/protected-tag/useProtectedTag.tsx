import { useLabelerAgent, useServerConfig } from '@/shell/ConfigurationContext'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ProtectedTagSetting } from './types'
import { ToolsOzoneTeamDefs } from '@atproto/api'
import { toast } from 'react-toastify'
import { useEffect, useState } from 'react'
import { useFullMemberList } from 'components/team/useMemberList'

const ProtectedTagSettingKey = 'tools.ozone.setting.protectedTags'

export const useProtectedTagList = () => {
  const labelerAgent = useLabelerAgent()
  return useQuery({
    queryKey: ['protected-tag-setting'],
    queryFn: async () => {
      const { data } = await labelerAgent.tools.ozone.setting.listOptions({
        scope: 'instance',
        keys: [ProtectedTagSettingKey],
      })

      const protectedTagSetting = data.options.find(
        (option) => option.key === ProtectedTagSettingKey,
      )

      return protectedTagSetting
        ? {
            ...protectedTagSetting,
            value: protectedTagSetting.value as ProtectedTagSetting,
          }
        : null
    },
  })
}

export const useProtectedTagEditor = () => {
  const queryClient = useQueryClient()
  const labelerAgent = useLabelerAgent()
  const { data: initialSetting } = useProtectedTagList()
  const [editorData, setEditorData] = useState<ProtectedTagSetting>({})
  const { role } = useServerConfig()
  const memberList = useFullMemberList()

  // Initialize editor data when the initial setting is loaded
  useEffect(() => {
    if (initialSetting) {
      setEditorData(initialSetting.value)
    }
  }, [initialSetting])

  const mutation = useMutation({
    mutationKey: ['protected-tag-setting', 'upsert'],
    mutationFn: async (value: ProtectedTagSetting) => {
      await labelerAgent.tools.ozone.setting.upsertOption({
        value,
        scope: 'instance',
        key: ProtectedTagSettingKey,
        managerRole: ToolsOzoneTeamDefs.ROLEADMIN,
      })
    },

    onSuccess: () => {
      queryClient.invalidateQueries([ProtectedTagSettingKey])
      toast.success('Protected tags saved')
    },

    onError: (error) => {
      toast.error(`Failed to save protected tags: ${error?.['message']}`)
    },
  })

  const handleAddKey = (key: string) => {
    const trimmedKey = key.trim()
    if (!trimmedKey || editorData[trimmedKey]) return
    setEditorData((prev) => ({ ...prev, [key]: { moderators: [] } }))
  }

  const handleUpdateField = (
    key: string,
    field: 'moderators' | 'roles',
    values: string[],
  ) => {
    setEditorData((prev) => ({
      ...prev,
      // we only want to keep one field at a time, don't allow configuring both moderator and role
      [key]: { [field]: values },
    }))
  }

  const handleRemoveKey = (key: string) => {
    setEditorData((prev) => {
      const { [key]: _, ...rest } = prev
      return rest
    })
  }

  const handleSave = () => {
    if (editorData) {
      mutation.mutate(editorData)
    }
  }

  return {
    memberList,
    mutation,
    editorData,
    setEditorData,
    handleSave,
    handleRemoveKey,
    handleAddKey,
    handleUpdateField,
    canManageTags: role === ToolsOzoneTeamDefs.ROLEADMIN,
  }
}
