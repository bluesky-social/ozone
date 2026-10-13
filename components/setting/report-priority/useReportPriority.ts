import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { ToolsOzoneTeamDefs } from '@atproto/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import type {
  PriorityLevel,
  PriorityLevels,
  ReportPriorityLevels,
} from './types'

export const PriorityLevelSettingKey = 'tools.ozone.setting.priorityLevels'
export const ReportPriorityLevelSettingKey =
  'tools.ozone.setting.reportPriorityLevels'

const queryKey = ['report-priority-settings']

type PrioritySettings = {
  levels: PriorityLevels
  mappings: ReportPriorityLevels
}

export type PrioritySettingChange =
  | { type: 'addLevel'; id: string; level: PriorityLevel }
  | {
      type: 'updateLevel'
      id: string
      patch: Partial<Omit<PriorityLevel, 'name'>>
    }
  | { type: 'removeLevel'; id: string }
  | { type: 'assignReason'; reason: string; level: string }
  | { type: 'removeReason'; reason: string }

function useReadPrioritySettings() {
  const labelerAgent = useLabelerAgent()
  return async (): Promise<PrioritySettings> => {
    const { data } = await labelerAgent.tools.ozone.setting.listOptions({
      scope: 'instance',
      keys: [PriorityLevelSettingKey, ReportPriorityLevelSettingKey],
    })
    return {
      levels: (data.options.find(
        (option) => option.key === PriorityLevelSettingKey,
      )?.value ?? {}) as PriorityLevels,
      mappings: (data.options.find(
        (option) => option.key === ReportPriorityLevelSettingKey,
      )?.value ?? {}) as ReportPriorityLevels,
    }
  }
}

export function useReportPrioritySettings() {
  const read = useReadPrioritySettings()
  return useQuery({ queryKey, queryFn: read })
}

export function useSaveReportPrioritySettings() {
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()
  const read = useReadPrioritySettings()
  const pending = useRef<Promise<unknown>>(Promise.resolve())

  const write = async (
    key: string,
    value: PriorityLevels | ReportPriorityLevels,
  ) => {
    await labelerAgent.tools.ozone.setting.upsertOption({
      scope: 'instance',
      key,
      value,
      managerRole: ToolsOzoneTeamDefs.ROLEADMIN,
    })
  }

  return useMutation({
    mutationFn: (change: PrioritySettingChange) => {
      // Each operation reads fresh settings after earlier writes have finished.
      const operation = pending.current.then(async () => {
        await queryClient.cancelQueries({ queryKey })
        const { levels, mappings } = await read()
        switch (change.type) {
          case 'addLevel':
            if (Object.hasOwn(levels, change.id)) {
              throw new Error('A level with this name already exists.')
            }
            levels[change.id] = change.level
            await write(PriorityLevelSettingKey, levels)
            break
          case 'updateLevel':
            if (!Object.hasOwn(levels, change.id)) {
              throw new Error('This priority level no longer exists.')
            }
            levels[change.id] = { ...levels[change.id], ...change.patch }
            await write(PriorityLevelSettingKey, levels)
            break
          case 'removeLevel': {
            const retainedMappings = Object.fromEntries(
              Object.entries(mappings).filter(
                ([, level]) => level !== change.id,
              ),
            )
            // Remove references before deleting the level they refer to.
            if (
              Object.keys(retainedMappings).length !==
              Object.keys(mappings).length
            ) {
              await write(ReportPriorityLevelSettingKey, retainedMappings)
            }
            delete levels[change.id]
            await write(PriorityLevelSettingKey, levels)
            return { levels, mappings: retainedMappings }
          }
          case 'assignReason':
            mappings[change.reason] = change.level
            await write(ReportPriorityLevelSettingKey, mappings)
            break
          case 'removeReason':
            delete mappings[change.reason]
            await write(ReportPriorityLevelSettingKey, mappings)
            break
        }
        return { levels, mappings }
      })
      pending.current = operation.catch(() => undefined)
      return operation
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKey, settings)
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey })
    },
  })
}
