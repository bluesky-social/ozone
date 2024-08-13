import { AtpAgent } from '@atproto/api'
import { HANDLE_RESOLVER_URL } from './constants'

// exported api
// =

export const globalAgent = new AtpAgent({
  service: HANDLE_RESOLVER_URL,
})
