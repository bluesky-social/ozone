import client from '@/lib/client'

const key = 'external_labeler_dids'

export const getExternalLabelers = () => {
  const labelers = localStorage.getItem(key)
  if (!labelers) return {}
  return JSON.parse(labelers)
}

export const addExternalLabelerDid = (did: string, data: any) => {
  const labelers = getExternalLabelers()
  if (labelers[did]) return labelers
  labelers[did] = data
  localStorage.setItem(key, JSON.stringify(labelers))
  return labelers
}

export const removeExternalLabelerDid = (did: string) => {
  const labelers = getExternalLabelers()
  const serviceDid = client.getServiceDid()?.split('#')[0]
  // Don't allow removing original service DID
  if (!labelers[did] || serviceDid === did) return labelers
  delete labelers[did]
  localStorage.setItem(key, JSON.stringify(labelers))
  return labelers
}
