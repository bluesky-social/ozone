import Next from 'next'

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_PLC_DIRECTORY_URL?: string
      NEXT_PUBLIC_QUEUE_CONFIG?: string
    }
  }
}
