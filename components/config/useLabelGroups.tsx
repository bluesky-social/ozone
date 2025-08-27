import { useLabelerAgent, useServerConfig } from '@/shell/ConfigurationContext'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ToolsOzoneTeamDefs } from '@atproto/api'
import { toast } from 'react-toastify'
import { useState, useEffect } from 'react'

const LabelGroupsSettingKey = 'tools.ozone.setting.labelGroups'

export type LabelGroup = {
  labels: string[]
  note?: string
  color?: string
}

export type LabelGroupsSetting = Record<string, LabelGroup>

export const useLabelGroupsList = () => {
  const labelerAgent = useLabelerAgent()
  return useQuery({
    queryKey: ['label-groups-setting'],
    queryFn: async () => {
      const { data } = await labelerAgent.tools.ozone.setting.listOptions({
        scope: 'instance',
        keys: [LabelGroupsSettingKey],
      })

      const labelGroupsSetting = data.options.find(
        (option) => option.key === LabelGroupsSettingKey,
      )

      return labelGroupsSetting
        ? {
            ...labelGroupsSetting,
            value: labelGroupsSetting.value as LabelGroupsSetting,
          }
        : null
    },
  })
}

export const useLabelGroupsEditor = () => {
  const queryClient = useQueryClient()
  const labelerAgent = useLabelerAgent()
  const { data: initialSetting } = useLabelGroupsList()
  const [editorData, setEditorData] = useState<LabelGroupsSetting>({})
  const { role } = useServerConfig()

  useEffect(() => {
    if (initialSetting) {
      setEditorData(initialSetting.value)
    }
  }, [initialSetting])

  const mutation = useMutation({
    mutationKey: ['label-groups-setting', 'upsert'],
    mutationFn: async (value: LabelGroupsSetting) => {
      await labelerAgent.tools.ozone.setting.upsertOption({
        value,
        scope: 'instance',
        key: LabelGroupsSettingKey,
        managerRole: ToolsOzoneTeamDefs.ROLEADMIN,
      })
    },

    onSuccess: () => {
      queryClient.invalidateQueries(['label-groups-setting'])
      toast.success('Label groups saved')
    },

    onError: (error) => {
      toast.error(`Failed to save label groups: ${error?.['message']}`)
    },
  })

  const handleAddGroup = (title: string, note?: string, color?: string) => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle || editorData[trimmedTitle]) return false

    setEditorData((prev) => ({
      ...prev,
      [trimmedTitle]: {
        labels: [],
        note: note?.trim() || undefined,
        color: color || undefined,
      },
    }))
    return true
  }

  const handleUpdateGroup = (
    title: string,
    updates: { labels?: string[]; note?: string; color?: string },
  ) => {
    setEditorData((prev) => ({
      ...prev,
      [title]: {
        ...prev[title],
        ...updates,
      },
    }))
  }

  const handleRemoveGroup = (title: string) => {
    setEditorData((prev) => {
      const { [title]: _, ...rest } = prev
      return rest
    })
  }

  const handleAddLabelToGroup = (groupTitle: string, label: string) => {
    setEditorData((prev) => {
      // Remove label from any other group first
      const updatedData = { ...prev }
      Object.keys(updatedData).forEach((key) => {
        if (key !== groupTitle) {
          updatedData[key] = {
            ...updatedData[key],
            labels: updatedData[key].labels.filter((l) => l !== label),
          }
        }
      })

      // Add to target group if not already there
      if (!updatedData[groupTitle]?.labels.includes(label)) {
        updatedData[groupTitle] = {
          ...updatedData[groupTitle],
          labels: [...(updatedData[groupTitle]?.labels || []), label],
        }
      }

      return updatedData
    })
  }

  const handleRemoveLabelFromGroup = (groupTitle: string, label: string) => {
    setEditorData((prev) => ({
      ...prev,
      [groupTitle]: {
        ...prev[groupTitle],
        labels: prev[groupTitle].labels.filter((l) => l !== label),
      },
    }))
  }

  const handleSave = () => {
    if (editorData) {
      mutation.mutate(editorData)
    }
  }

  const getGroupTitles = () => Object.keys(editorData)

  const validateGroupTitle = (title: string) => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return 'Group title is required'
    if (editorData[trimmedTitle]) return 'Group title already exists'
    return null
  }

  const getLabelGroup = (label: string) => {
    return Object.entries(editorData).find(([_, group]) =>
      group.labels.includes(label),
    )?.[0]
  }

  return {
    mutation,
    editorData,
    setEditorData,
    handleSave,
    handleAddGroup,
    handleUpdateGroup,
    handleRemoveGroup,
    handleAddLabelToGroup,
    handleRemoveLabelFromGroup,
    getGroupTitles,
    validateGroupTitle,
    getLabelGroup,
    canManageGroups: role === ToolsOzoneTeamDefs.ROLEADMIN,
  }
}

export const useLabelGroups = () => {
  const { data } = useLabelGroupsList()
  return data?.value || null
}
