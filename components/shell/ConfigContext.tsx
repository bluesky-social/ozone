'use client'

import { createContext, ReactNode, useContext, useMemo } from 'react'

import { Loading } from '@/common/Loader'
import { SetupModal } from '@/common/SetupModal'
import { getConfig, OzoneConfig } from '@/lib/client-config'
import { useStoredQuery } from '@/lib/useStoredQuery'
import { GLOBAL_QUERY_CONTEXT } from './QueryClient'

export type ConfigContextData = {
  config: OzoneConfig
  configError: Error | null
  refetchConfig: () => void
}

const ConfigContext = createContext<ConfigContextData | null>(null)

export const ConfigProvider = ({ children }: { children: ReactNode }) => {
  const { data, error, refetch } = useStoredQuery({
    // Use the global query client to avoid clearing the cache when the user
    // changes.
    context: GLOBAL_QUERY_CONTEXT,
    // TODO: change getConfig() to throw a specific error when a network
    // error occurs, so we can distinguish between network errors and
    // configuration errors.
    retry: false,
    queryKey: ['labeler-config'],
    queryFn: getConfig,
    // Refetching will be handled manually
    refetchOnWindowFocus: false,
    // Initialize with data from the legacy key (can be removed in the future)
    initialData:
      typeof window === 'undefined'
        ? undefined
        : ((legacyKey: string) => {
            try {
              const data = localStorage.getItem(legacyKey)
              if (data) return JSON.parse(data)
            } catch {
              // Ignore
            } finally {
              localStorage.removeItem(legacyKey)
            }
          })('labeler-config'),
  })

  const value = useMemo<ConfigContextData | null>(
    () =>
      data
        ? {
            config: data,
            configError:
              error == null
                ? null
                : error instanceof Error
                ? error
                : new Error('Unknown error', { cause: error }),
            refetchConfig: refetch,
          }
        : null,
    [data, error, refetch],
  )

  if (!value) {
    return (
      <SetupModal>
        <Loading message="Initializing..." />
      </SetupModal>
    )
  }

  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  )
}

export function useConfigContext() {
  const context = useContext(ConfigContext)
  if (context) return context

  throw new Error(`useConfigContext() must be used within a <ConfigProvider />`)
}
