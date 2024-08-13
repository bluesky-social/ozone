'use client'

import { Agent } from '@atproto/api'
import { useQuery } from '@tanstack/react-query'
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { SetupModal } from '@/common/SetupModal'
import { getConfig, OzoneConfig } from '@/lib/client-config'
import {
  parseServerConfig,
  PermissionName,
  ServerConfig,
} from '@/lib/server-config'
import { useAuthContext } from './AuthContext'
import { ConfigurationFlow } from './ConfigurationFlow'
import { GLOBAL_QUERY_CONTEXT } from './QueryClient'
import { useLocalStorage } from 'react-use'

export enum ConfigurationState {
  Pending,
  Ready,
  Unconfigured,
  Unauthorized,
}

export type ReconfigureOptions = {
  skipRecord?: boolean
}

export type ConfigurationContextData = {
  /** An agent to use in order to communicate with the labeler on the user's behalf. */
  labelerAgent: Agent
  isServiceAccount: boolean
  config: OzoneConfig
  serverConfig: ServerConfig
  reconfigure: (options?: ReconfigureOptions) => void
}

const ConfigurationContext = createContext<ConfigurationContextData | null>(
  null,
)

export const ConfigurationProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [cachedConfig, setCachedConfig] =
    useLocalStorage<OzoneConfig>('labeler-config')

  // Fetch the labeler static configuration
  const {
    data: config,
    error: configError,
    refetch: refetchConfig,
  } = useQuery<OzoneConfig, Error>({
    // Use the global query client to avoid clearing the cache when the user
    // changes.
    context: GLOBAL_QUERY_CONTEXT,
    retry: (failureCount: number, error: Error): boolean => {
      // TODO: change getConfig() to throw a specific error when a network
      // error occurs, so we can distinguish between network errors and
      // configuration errors.
      return false
    },
    queryKey: ['labeler-config'],
    queryFn: async () => getConfig(),
    initialData: cachedConfig,
    // Refetching will be handled manually
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (config) setCachedConfig(config)
  }, [config, setCachedConfig])

  // Derive an agent for communicating with the labeler, if we have a config and
  // an (authenticated) PDS agent.
  const { pdsAgent } = useAuthContext()
  const labelerAgent = useMemo<Agent | undefined>(() => {
    if (!pdsAgent) return undefined
    if (!config?.did) return undefined

    const [did, id = 'atproto_labeler'] = config.did.split('#')
    return pdsAgent.withProxy(id, did)
  }, [pdsAgent, config?.did])

  const [cachedServerConfig, setCachedServerConfig] =
    useLocalStorage<ServerConfig>('labeler-server-config')

  // Fetch the user's server configuration
  const {
    data: serverConfig,
    error: serverConfigError,
    refetch: refetchServerConfig,
  } = useQuery({
    enabled: labelerAgent != null,
    retry: (failureCount: number, error: Error): boolean => {
      if (error?.['status'] === 401) return false
      return failureCount < 3
    },
    queryKey: ['server-config'],
    queryFn: async ({ signal }) => {
      const { data } = await labelerAgent!.tools.ozone.server.getConfig(
        {},
        { signal },
      )
      return parseServerConfig(data)
    },
    initialData: cachedServerConfig,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (serverConfig) setCachedServerConfig(serverConfig)
  }, [serverConfig, setCachedServerConfig])

  // Allow ignoring the creation of a record when reconfiguring
  const [skipRecord, setSkipRecord] = useState(false)
  useEffect(() => setSkipRecord(false), [labelerAgent]) // Reset on credential change

  const accountDid = labelerAgent?.did

  const state = useMemo<ConfigurationState>(() => {
    if (serverConfigError?.['status'] === 401) {
      return ConfigurationState.Unauthorized
    } else if (!config || !serverConfig) {
      return ConfigurationState.Pending
    } else if (!serverConfig.role) {
      return ConfigurationState.Unauthorized
    } else if (
      config.needs.key ||
      config.needs.service ||
      (config.needs.record && config.did === accountDid && !skipRecord)
    ) {
      return ConfigurationState.Unconfigured
    } else {
      return ConfigurationState.Ready
    }
  }, [config, serverConfigError, serverConfig, skipRecord, accountDid])

  const reconfigure = useCallback(
    async (options?: ReconfigureOptions) => {
      if (options?.skipRecord != null) setSkipRecord(options.skipRecord)
      await refetchConfig()
      await refetchServerConfig()
    },
    [refetchConfig, refetchServerConfig],
  )

  const configurationContextData = useMemo<ConfigurationContextData | null>(
    () =>
      // Note conditions here are redundant, but required for type safety
      state === ConfigurationState.Ready &&
      config &&
      serverConfig &&
      labelerAgent
        ? {
            config,
            isServiceAccount: accountDid === config.did,
            serverConfig,
            labelerAgent,
            reconfigure,
          }
        : null,
    [state, accountDid, config, serverConfig, labelerAgent, reconfigure],
  )

  if (!configurationContextData) {
    return (
      <SetupModal>
        <ConfigurationFlow
          config={config}
          state={state}
          error={configError || serverConfigError}
          reconfigure={reconfigure}
          labelerAgent={labelerAgent}
        />
      </SetupModal>
    )
  }

  return (
    <ConfigurationContext.Provider value={configurationContextData}>
      {children}
    </ConfigurationContext.Provider>
  )
}

export const useConfigurationContext = () => {
  const value = useContext(ConfigurationContext)
  if (value) return value

  throw new Error(
    `useConfigurationContext() must be used within a <ConfigurationProvider />`,
  )
}

export function useLabelerAgent() {
  return useConfigurationContext().labelerAgent
}

export function useServerConfig() {
  return useConfigurationContext().serverConfig
}

export function usePermission(name: PermissionName) {
  return useServerConfig().permissions[name]
}
