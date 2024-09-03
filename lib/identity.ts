import { globalAgent } from './client'
import { PLC_DIRECTORY_URL } from './constants'

export const getDidFromHandle = async (
  handle: string,
): Promise<string | null> => {
  try {
    const { data } = await globalAgent.resolveHandle({ handle })
    return data.did
  } catch (err) {
    return null
  }
}

export const resolveDidDocData = async function (
  did: string,
  signal?: AbortSignal,
): Promise<DidDocData | null> {
  if (did.startsWith('did:plc:')) {
    const url = new URL(`/${did}/data`, PLC_DIRECTORY_URL)
    const res = await fetch(url, { signal })
    if (res.status !== 200) return null
    const doc = await res.json()
    return doc
  }
  if (did.startsWith('did:web:')) {
    const hostname = did.slice('did:web:'.length)
    const url = new URL(`/.well-known/did.json`, hostname)
    const res = await fetch(url, { signal })
    if (res.status !== 200) return null
    const doc = await res.json().catch(() => null)
    if (!doc || typeof doc !== 'object' || doc['id'] !== did) return null
    return didDocToData(doc)
  }
  return null
}

export function didDocToData(doc: {
  id: string
  [key: string]: unknown
}): DidDocData {
  return {
    did: doc.id,
    alsoKnownAs: Array.isArray(doc['alsoKnownAs']) ? doc['alsoKnownAs'] : [],
    verificationMethods: Array.isArray(doc['verificationMethod'])
      ? doc['verificationMethod'].reduce((acc, vm) => {
          if (
            vm &&
            typeof vm['id'] === 'string' &&
            vm['type'] === 'Multikey' &&
            typeof vm['publicKeyMultibase'] === 'string'
          ) {
            const [, id] = vm['id'].split('#')
            acc[id] = `did:key:${vm['publicKeyMultibase']}`
          }
          return acc
        }, {})
      : {},
    services: Array.isArray(doc['service'])
      ? doc['service'].reduce((acc, s) => {
          if (
            s &&
            typeof s['id'] === 'string' &&
            typeof s['type'] === 'string' &&
            typeof s['serviceEndpoint'] === 'string'
          ) {
            const [, id] = s['id'].split('#')
            acc[id] = {
              type: s['type'],
              serviceEndpoint: s['serviceEndpoint'],
            }
          }
          return acc
        }, {})
      : {},
  }
}

export type DidDocData = {
  did: string
  alsoKnownAs: string[]
  verificationMethods: Record<string, string>
  services: Record<string, { type: string; endpoint: string }>
}
