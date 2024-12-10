'use client'

import { Agent, CredentialSession } from '@atproto/api'
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
import { OzoneConfig } from '@/lib/client-config'
import { PermissionName, ServerConfig } from '@/lib/server-config'
import { useAuthContext } from './AuthContext'
import { useConfigContext } from './ConfigContext'
import { useServerConfigQuery } from './ConfigurationContext/useServerConfigQuery'
import { ConfigurationFlow } from './ConfigurationFlow'

export enum ConfigurationState {
  Pending,
  Ready,
  Unconfigured,
  Unauthorized,
}

export type ConfigurationContextData = {
  /** An agent to use in order to communicate with the labeler on the user's behalf. */
  labelerAgent: Agent
  isServiceAccount: boolean
  config: OzoneConfig
  serverConfig: ServerConfig
  reconfigure: () => void
}

const ConfigurationContext = createContext<ConfigurationContextData | null>(
  null,
)

export const ConfigurationProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  // Fetch the labeler static configuration
  const { config, configError, refetchConfig } = useConfigContext()

  // Derive an agent for communicating with the labeler, if we have a config and
  // an (authenticated) PDS agent.
  const { pdsAgent } = useAuthContext()
  const labelerAgent = useMemo<Agent>(() => {
    const [did, id = 'atproto_labeler'] = config.did.split('#')
    return pdsAgent.withProxy(id, did)
  }, [pdsAgent, config.did])

  // Fetch the user's server configuration
  const {
    data: serverConfig,
    error: serverConfigError,
    refetch: refetchServerConfig,
    isLoading: isServerConfigLoading,
  } = useServerConfigQuery(labelerAgent)

  // Allow ignoring the creation of a record when reconfiguring
  const [skipRecord, setSkipRecord] = useState(false)

  // Reset "skipRecord" on credential change
  useEffect(() => setSkipRecord(false), [labelerAgent])

  const isServiceAccount = labelerAgent.did === config.did

  const state =
    serverConfigError?.['status'] === 401
      ? ConfigurationState.Unauthorized
      : config.needs.key ||
        config.needs.service ||
        (config.needs.record && isServiceAccount && !skipRecord)
      ? ConfigurationState.Unconfigured
      : !serverConfig
      ? isServerConfigLoading
        ? ConfigurationState.Pending
        : ConfigurationState.Unconfigured
      : !serverConfig.role
      ? ConfigurationState.Unauthorized
      : ConfigurationState.Ready

  const reconfigure = useCallback(async () => {
    await refetchConfig()
    await refetchServerConfig()
  }, [refetchConfig, refetchServerConfig])

  const configurationContextData = useMemo<ConfigurationContextData | null>(
    () =>
      // Note conditions here are redundant, but required for type safety
      state === ConfigurationState.Ready &&
      config &&
      serverConfig &&
      labelerAgent
        ? {
            config,
            isServiceAccount,
            serverConfig,
            labelerAgent,
            reconfigure,
          }
        : null,
    [state, config, isServiceAccount, serverConfig, labelerAgent, reconfigure],
  )

  if (!configurationContextData) {
    return (
      <SetupModal>
        <ConfigurationFlow
          config={config}
          state={state}
          error={configError || serverConfigError}
          reconfigure={reconfigure}
          skipRecordCreation={() => setSkipRecord(true)}
          createRecord={async () => {
            await pdsAgent.com.atproto.repo.putRecord({
              repo: config!.did,
              collection: 'app.bsky.labeler.service',
              rkey: 'self',
              record: {
                createdAt: new Date().toISOString(),
                policies: { labelValues: [] },
              },
            })

            await reconfigure()
          }}
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

export function useConfigurationContext() {
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

export function useAppviewAgent() {
  const { appview } = useServerConfig()
  return useMemo<Agent | null>(() => {
    if (appview) return new Agent(appview)
    return null
  }, [appview])
}
