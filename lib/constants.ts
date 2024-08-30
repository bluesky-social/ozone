export const OAUTH_SCOPE = 'atproto transition:generic'

export const OZONE_SERVICE_DID =
  process.env.NEXT_PUBLIC_OZONE_SERVICE_DID || undefined

export const OZONE_PUBLIC_URL =
  process.env.NEXT_PUBLIC_OZONE_PUBLIC_URL || undefined

export const PLC_DIRECTORY_URL =
  process.env.NEXT_PUBLIC_PLC_DIRECTORY_URL ||
  (process.env.NODE_ENV === 'development'
    ? 'http://localhost:2582'
    : 'https://plc.directory')

export const QUEUE_CONFIG = process.env.NEXT_PUBLIC_QUEUE_CONFIG || '{}'

export const SOCIAL_APP_URL =
  process.env.NEXT_PUBLIC_SOCIAL_APP_URL ||
  (process.env.NODE_ENV === 'development'
    ? 'http://localhost:2584'
    : 'https://bsky.app')

export const HANDLE_RESOLVER_URL =
  process.env.NEXT_PUBLIC_HANDLE_RESOLVER_URL ||
  (process.env.NODE_ENV === 'development'
    ? 'http://localhost:2584'
    : 'https://api.bsky.app')

export const DM_DISABLE_TAG = 'chat-disabled'
export const VIDEO_UPLOAD_DISABLE_TAG = 'video-upload-disabled'

export const STARTER_PACK_OG_CARD_URL = `https://ogcard.cdn.bsky.app/start`
