'use client'

import { useQuery } from '@tanstack/react-query'
import { createContext, ReactNode, useContext, useEffect, useMemo } from 'react'
import { useLocalStorage } from 'react-use'

import { Loading } from '@/common/Loader'
import { SetupModal } from '@/common/SetupModal'
import { getConfig, OzoneConfig } from '@/lib/client-config'
import { GLOBAL_QUERY_CONTEXT } from './QueryClient'

export type ConfigContextData = {
  config: OzoneConfig
  configError: Error | null
  refetchConfig: () => void
}

const ConfigContext = createContext<ConfigContextData | null>(null)

export const ConfigProvider = ({ children }: { children: ReactNode }) => {
  const [cachedConfig, setCachedConfig] =
    useLocalStorage<OzoneConfig>('labeler-config')

  const { data, error, refetch } = useQuery<OzoneConfig, Error>({
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
    queryFn: getConfig,
    initialData: cachedConfig,
    // Refetching will be handled manually
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (data) setCachedConfig(data)
  }, [data, setCachedConfig])

  const value = useMemo(
    () =>
      data
        ? {
            config: data,
            configError: error,
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
