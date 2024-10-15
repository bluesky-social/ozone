import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react'

import { unique } from '@/lib/util'
import { useQueryClient } from '@tanstack/react-query'
import { useLocalStorage } from 'react-use'
import { useConfigurationContext } from './ConfigurationContext'

const KEY = 'external_labeler_value'

export type ExternalLabelers = string[]
export type ExternalLabelersData = [
  labelers: ExternalLabelers,
  setLabelers: (value: ExternalLabelers) => void,
]

export const ExternalLabelersContext =
  createContext<ExternalLabelersData | null>(null)

export const ExternalLabelersProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const { config, labelerAgent, appviewAgent } = useConfigurationContext()
  const queryClient = useQueryClient()

  const [state = [], setState] = useLocalStorage<ExternalLabelers>(KEY, [], {
    raw: false,
    serializer: JSON.stringify,
    deserializer: (value) => {
      try {
        const parsed = JSON.parse(value)
        if (Array.isArray(parsed)) return unique(parsed)
        // Migrate legacy data
        return Object.keys(parsed)
      } catch {
        return []
      }
    },
  })

  const externalLabelers = useMemo<ExternalLabelers>(
    () => unique(state.filter((did) => did !== config.did)),
    [config.did, state],
  )
  const setExternalLabelers = useCallback(
    (value: ExternalLabelers): void => {
      setState(unique(value).filter((did) => did !== config.did))
    },
    [setState, config.did],
  )

  // Keep the labelers header up-to-date with the external labelers
  useEffect(() => {
    labelerAgent.configureLabelers([config.did, ...externalLabelers])
    // If we have an appviewAgent, make sure it respects all configured labelers
    if (appviewAgent) {
      appviewAgent.configureLabelers([config.did, ...externalLabelers])
    }
  }, [labelerAgent, appviewAgent, config.did, externalLabelers])

  // Invalidate all queries whenever the external labelers (really) change
  const externalLabelersRef = useRef(externalLabelers)
  useEffect(() => {
    if (externalLabelersRef.current !== externalLabelers) {
      externalLabelersRef.current = externalLabelers
      queryClient.invalidateQueries()
    }
  }, [queryClient, externalLabelers])

  // Expose external labelers state as context value
  const value = useMemo<ExternalLabelersData>(
    () => [externalLabelers, setExternalLabelers],
    [externalLabelers, setExternalLabelers],
  )

  return (
    <ExternalLabelersContext.Provider value={value}>
      {children}
    </ExternalLabelersContext.Provider>
  )
}

export function useExternalLabelers() {
  const context = useContext(ExternalLabelersContext)
  if (context) return context

  throw new Error(
    'useExternalLabelersContext must be used within an ExternalLabelersProvider',
  )
}
