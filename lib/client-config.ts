import { AppBskyLabelerService } from '@atproto/api'
import { OZONE_PUBLIC_URL, OZONE_SERVICE_DID } from './constants'
import { DidDocData, resolveDidDocData } from './identity'

export async function getConfig(): Promise<OzoneConfig> {
  let doc: DidDocData | null = null
  let meta: OzoneMeta | null = null
  const labelerDid = OZONE_SERVICE_DID?.split('#')[0] // ensure no service id
  if (labelerDid) {
    doc = await resolveDidDocData(labelerDid)
    const labelerUrl = doc && getServiceUrlFromDoc(doc, 'atproto_labeler')
    if (labelerUrl) {
      meta = await getOzoneMeta(labelerUrl)
    } else {
      meta = await getOzoneMeta(OZONE_PUBLIC_URL || window.location.origin)
    }
  } else {
    meta = await getOzoneMeta(OZONE_PUBLIC_URL || window.location.origin)
    if (meta) {
      doc = await resolveDidDocData(meta.did)
    }
  }

  const did = meta?.did ?? labelerDid

  if (!did) {
    throw new Error('Could not determine an Ozone service DID')
  } else if (labelerDid && did !== labelerDid) {
    throw new Error('Mismatch between Ozone service DID and meta info')
  }

  const labelerUrl = doc && getServiceUrlFromDoc(doc, 'atproto_labeler')
  const labelerKey = doc && getDidKeyFromDoc(doc, 'atproto_label')
  const handle = doc && getHandleFromDoc(doc)
  const pdsUrl = doc && getServiceUrlFromDoc(doc, 'atproto_pds')
  const record = pdsUrl ? await getLabelerServiceRecord(pdsUrl, did) : null
  return {
    did,
    doc,
    meta,
    handle,
    labeler: record,
    matching: {
      service:
        labelerUrl && meta
          ? normalizeUrl(labelerUrl) === normalizeUrl(meta.url)
          : false,
      key: labelerKey && meta ? labelerKey === meta.publicKey : false,
    },
    needs: {
      identity: !doc,
      service: !labelerUrl,
      key: !labelerKey,
      pds: !pdsUrl,
      record: !record,
    },
    updatedAt: new Date().toISOString(),
  }
}

async function getOzoneMeta(serviceUrl: string) {
  try {
    const url = new URL('/.well-known/ozone-metadata.json', serviceUrl)
    const res = await fetch(url)
    if (res.status !== 200) return null
    const meta = await res.json()
    if (typeof meta?.did !== 'string') return null
    return meta as OzoneMeta
  } catch (e) {
    return null
  }
}

function getHandleFromDoc(doc: DidDocData) {
  const handleAka = doc.alsoKnownAs.find(
    (aka) => typeof aka === 'string' && aka.startsWith('at://'),
  )
  if (!handleAka) return null
  return handleAka.replace('at://', '')
}

function getDidKeyFromDoc(doc: DidDocData, keyId: string): string | null {
  return doc.verificationMethods[keyId] ?? null
}

export function getServiceUrlFromDoc(
  doc: DidDocData,
  serviceId: string,
): string | null {
  return doc.services[serviceId]?.endpoint ?? null
}

async function getLabelerServiceRecord(pdsUrl: string, did: string) {
  const url = new URL('/xrpc/com.atproto.repo.getRecord', pdsUrl)
  url.searchParams.set('repo', did)
  url.searchParams.set('collection', 'app.bsky.labeler.service')
  url.searchParams.set('rkey', 'self')
  const res = await fetch(url)
  if (res.status !== 200) return null
  const recordInfo = await res.json()
  if (!recordInfo?.['value'] || typeof recordInfo['value'] !== 'object') {
    return null
  }
  return recordInfo['value'] as AppBskyLabelerService.Record
}

function normalizeUrl(url: string) {
  return new URL(url).href
}

export function withDocAndMeta(config: OzoneConfig) {
  if (config.doc === null) throw new Error('Missing doc in Ozone config')
  if (config.meta === null) throw new Error('Missing meta info in Ozone config')
  return config as OzoneConfigFull
}

type OzoneMeta = { did: string; url: string; publicKey: string }

export type OzoneConfig = {
  did: string
  labeler: AppBskyLabelerService.Record | null
  handle: string | null
  meta: OzoneMeta | null
  doc: DidDocData | null
  matching: { service: boolean; key: boolean }
  needs: {
    identity: boolean
    service: boolean
    key: boolean
    pds: boolean
    record: boolean
  }
  updatedAt: string
}

export type OzoneConfigFull = OzoneConfig & {
  meta: OzoneMeta
  doc: DidDocData
}
