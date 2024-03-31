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
  if (!labelers[did]) return labelers
  delete labelers[did]
  localStorage.setItem(key, JSON.stringify(labelers))
  return labelers
}
