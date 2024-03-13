import Next from 'next'

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_PLC_DIRECTORY_URL?: string // e.g. https://plc.directory
      NEXT_PUBLIC_QUEUE_CONFIG?: string
      NEXT_PUBLIC_OZONE_SERVICE_DID?: string // e.g. did:plc:xxx#atproto_labeler
    }
  }
}
