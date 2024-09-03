import Next from 'next'

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_HANDLE_RESOLVER_URL?: string // e.g. https://resolver.example.com
      NEXT_PUBLIC_PLC_DIRECTORY_URL?: string // e.g. https://plc.directory
      NEXT_PUBLIC_QUEUE_CONFIG?: string
      NEXT_PUBLIC_OZONE_SERVICE_DID?: string // e.g. did:plc:xxx#atproto_labeler
      NEXT_PUBLIC_OZONE_PUBLIC_URL?: string // e.g. https://ozone.example.com (falls back to window.location.origin)
      NEXT_PUBLIC_SOCIAL_APP_URL?: string // e.g. https://bsky.app
    }
  }
}
