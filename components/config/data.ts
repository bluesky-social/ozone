import client from '@/lib/client'
import { getLocalStorageData, setLocalStorageData } from '@/lib/local-storage'
import { AppBskyLabelerDefs, ComAtprotoLabelDefs } from '@atproto/api'

const KEY = 'external_labeler_dids'

type LabelerDetails =
  | (AppBskyLabelerDefs.LabelerViewDetailed & {
      policies: AppBskyLabelerDefs.LabelerPolicies & {
        definitionById: Record<string, ComAtprotoLabelDefs.LabelValueDefinition>
      }
    })
  | null
type ExternalLabelers = Record<string, LabelerDetails>

export const getExternalLabelers = () => {
  const labelers = getLocalStorageData<ExternalLabelers>(KEY)
  if (!labelers) return {}
  return labelers
}

export const addExternalLabelerDid = (did: string, data: LabelerDetails) => {
  const labelers = getExternalLabelers()
  if (labelers[did]) return labelers
  labelers[did] = data
  setLocalStorageData(KEY, labelers)
  return labelers
}

export const removeExternalLabelerDid = (did: string) => {
  const labelers = getExternalLabelers()
  const serviceDid = client.getServiceDid()?.split('#')[0]
  // Don't allow removing original service DID
  if (!labelers[did] || serviceDid === did) return labelers
  delete labelers[did]
  setLocalStorageData(KEY, labelers)
  return labelers
}
