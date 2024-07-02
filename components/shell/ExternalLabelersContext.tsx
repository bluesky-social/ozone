import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { ExtendedLabelerServiceDef } from '@/common/labels'
import { getLocalStorageData, setLocalStorageData } from '@/lib/local-storage'
import { useQueryClient } from '@tanstack/react-query'
import { unique } from '@/lib/util'
import { useConfigurationContext } from './ConfigurationContext'

const KEY = 'external_labeler_dids'

export type ExternalLabelers = string[]
export type ExternalLabelersManager = {
  dids: ExternalLabelers
  add: (did: string) => void
  remove: (did: string) => void
}

export const ExternalLabelersContext =
  createContext<ExternalLabelersManager | null>(null)

export const ExternalLabelersProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [externalLabelers, setExternalLabelers] = useState(getExternalLabelers)

  // Keep the labelers header up-to-date with the external labelers
  const { config, labelerAgent } = useConfigurationContext()
  useEffect(() => {
    labelerAgent?.configureLabelersHeader(
      unique([config.did, ...externalLabelers]),
    )
  }, [labelerAgent, config.did, externalLabelers])

  // Invalidate all queries whenever the external labelers change
  const queryClient = useQueryClient()
  useEffect(() => {
    queryClient.invalidateQueries()
  }, [queryClient, externalLabelers])

  // Expose external labelers management instance to children
  const value = useMemo<ExternalLabelersManager>(
    () => ({
      dids: externalLabelers,
      add: (did: string) => {
        if (did === config.did) return
        setExternalLabelers(addExternalLabelerDid(did))
      },
      remove: (did: string) => {
        setExternalLabelers(removeExternalLabelerDid(did))
      },
    }),
    [externalLabelers, config.did],
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

type ExternalLabelersLegacy = Record<string, ExtendedLabelerServiceDef>

function getExternalLabelers(): ExternalLabelers {
  const labelers = getLocalStorageData<
    ExternalLabelers | ExternalLabelersLegacy
  >(KEY)
  if (labelers === undefined) return []

  if (!Array.isArray(labelers)) {
    // Migrate legacy data
    try {
      const dids = Object.keys(labelers)
      setLocalStorageData<ExternalLabelers>(KEY, dids)
      return dids
    } catch (e) {
      removeExternalLabelerDid(KEY)
      return []
    }
  }

  return labelers
}

function addExternalLabelerDid(did: string) {
  const labelers = getExternalLabelers()
  if (labelers.includes(did)) return labelers
  labelers.push(did)
  setLocalStorageData<ExternalLabelers>(KEY, labelers)
  return labelers
}

function removeExternalLabelerDid(did: string) {
  const labelers = getExternalLabelers()
  const index = labelers.indexOf(did)
  if (index === -1) return labelers
  labelers.splice(index, 1)
  setLocalStorageData<ExternalLabelers>(KEY, labelers)
  return labelers
}
