export const OZONE_SERVICE_DID =
  process.env.NEXT_PUBLIC_OZONE_SERVICE_DID || undefined

export const PLC_DIRECTORY_URL =
  process.env.NEXT_PUBLIC_PLC_DIRECTORY_URL || `https://plc.directory`

export const QUEUE_CONFIG = process.env.NEXT_PUBLIC_QUEUE_CONFIG || '{}'

export const SOCIAL_APP_DOMAIN = 'bsky.app'
export const SOCIAL_APP_URL = `https://${SOCIAL_APP_DOMAIN}`

export const DM_DISABLE_TAG = 'chat-disabled'
export const VIDEO_UPLOAD_DISABLE_TAG = 'video-upload-disabled'

export const STARTER_PACK_OG_CARD_URL = `https://ogcard.cdn.bsky.app/start`

export const NEW_ACCOUNT_MARKER_THRESHOLD_IN_DAYS = process.env
  .NEXT_PUBLIC_NEW_ACCOUNT_MARKER_THRESHOLD_IN_DAYS
  ? parseInt(process.env.NEXT_PUBLIC_NEW_ACCOUNT_MARKER_THRESHOLD_IN_DAYS)
  : 7

export const YOUNG_ACCOUNT_MARKER_THRESHOLD_IN_DAYS = process.env
  .NEXT_PUBLIC_YOUNG_ACCOUNT_MARKER_THRESHOLD_IN_DAYS
  ? parseInt(process.env.NEXT_PUBLIC_YOUNG_ACCOUNT_MARKER_THRESHOLD_IN_DAYS)
  : 30
