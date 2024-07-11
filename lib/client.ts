import { BskyAgent } from '@atproto/api'
import { SOCIAL_APP_URL } from './constants'

// exported api
// =

export const globalAgent = new BskyAgent({ service: SOCIAL_APP_URL })
