import { ExtendedLabelerServiceDef } from '@/common/labels'
import { getLocalStorageData, setLocalStorageData } from '@/lib/local-storage'

const KEY = 'external_labeler_dids'

type ExternalLabelers = Record<string, ExtendedLabelerServiceDef>

export const getExternalLabelers = () => {
  const labelers = getLocalStorageData<ExternalLabelers>(KEY)
  if (!labelers) return {}
  return labelers
}

export const addExternalLabelerDid = (
  did: string,
  data: ExtendedLabelerServiceDef,
) => {
  const labelers = getExternalLabelers()
  if (labelers[did]) return labelers
  labelers[did] = data
  setLocalStorageData(KEY, labelers)
  return labelers
}

export const removeExternalLabelerDid = (did: string) => {
  const labelers = getExternalLabelers()
  delete labelers[did]
  setLocalStorageData(KEY, labelers)
  return labelers
}
