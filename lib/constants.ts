export const OZONE_SERVICE_DID =
  process.env.NEXT_PUBLIC_OZONE_SERVICE_DID ||
  'did:plc:6g4653454yhzlp2t4fu4y7wn' ||
  undefined

export const PLC_DIRECTORY_URL =
  process.env.NEXT_PUBLIC_PLC_DIRECTORY_URL || 'http://localhost:2582' || `https://plc.directory`

export const QUEUE_CONFIG = process.env.NEXT_PUBLIC_QUEUE_CONFIG || '{}'

export const SOCIAL_APP_DOMAIN = 'bsky.app'
export const SOCIAL_APP_URL = `https://${SOCIAL_APP_DOMAIN}`
