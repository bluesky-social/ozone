import type { Agent } from '@atproto/api'
import { useQuery } from '@tanstack/react-query'
import { useConfigurationContext } from '../shell/ConfigurationContext'
import {
  ADMIN_ROLE,
  EMPTY_SETTINGS,
  SETTING_KEY,
  validateSettings,
} from './validation'
import type { Settings } from './types'

export async function loadSettings(
  agent: Agent,
  signal?: AbortSignal,
): Promise<Settings | null> {
  const { data } = await agent.tools.ozone.setting.listOptions(
    {
      scope: 'instance',
      keys: [SETTING_KEY],
    },
    { signal },
  )
  const option = data.options[0]
  return option ? validateSettings(option.value) : null
}

export const settingsQueryKey = (service: string, moderator: string) => [
  SETTING_KEY,
  service,
  moderator,
  'instance',
]

export async function manageSettings(
  agent: Agent,
  role: string | undefined,
  mode: 'save' | 'clear' | 'delete',
  value?: Settings,
) {
  if (role !== ADMIN_ROLE)
    throw new Error('Only admins can manage custom actions')
  // Re-read the role at the boundary; the editor may have been open through a role change.
  const { data } = await agent.tools.ozone.server.getConfig()
  if (data.viewer?.role !== ADMIN_ROLE)
    throw new Error('Only admins can manage custom actions')
  if (mode === 'delete') {
    await agent.tools.ozone.setting.removeOptions({
      keys: [SETTING_KEY],
      scope: 'instance',
    })
    if (await loadSettings(agent))
      throw new Error(
        'The setting is still present; deletion could not be confirmed',
      )
  } else {
    const next = validateSettings(mode === 'clear' ? EMPTY_SETTINGS : value)
    await agent.tools.ozone.setting.upsertOption({
      key: SETTING_KEY,
      scope: 'instance',
      managerRole: ADMIN_ROLE,
      value: next,
    })
  }
}

export function useCustomActionSettings() {
  const { labelerAgent, config } = useConfigurationContext()
  const query = useQuery({
    queryKey: settingsQueryKey(config.did, labelerAgent.did!),
    queryFn: () => loadSettings(labelerAgent),
    retry: false,
    staleTime: 0,
    cacheTime: 0,
  })
  return {
    ...query,
    actions: query.isError ? [] : query.data?.customActions || [],
  }
}
