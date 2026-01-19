import { Agent } from '@atproto/api'
import { ResponseType, XRPCError } from '@atproto/xrpc'

import { parseServerConfig } from '@/lib/server-config'
import { useStoredQuery } from '@/lib/useStoredQuery'

export function useServerConfigQuery(agent: Agent) {
  return useStoredQuery({
    queryKey: ['server-config', agent.assertDid, agent.proxy ?? null],
    queryFn: async ({ signal }) => {
      const { data } = await agent.tools.ozone.server.getConfig({}, { signal })
      return parseServerConfig(data)
    },
    retry,
    retryDelay,
    refetchOnWindowFocus: false,
    // Initialize with data from the legacy key (can be removed in the future)
    initialData:
      typeof window === 'undefined'
        ? undefined
        : ((legacyKey: string) => {
            try {
              const data = localStorage.getItem(legacyKey)
              if (data) return JSON.parse(data)
            } catch {
              // Ignore
            } finally {
              localStorage.removeItem(legacyKey)
            }
          })('labeler-server-config'),
  })
}

const retry = (failureCount: number, error: unknown): boolean => {
  if (error instanceof XRPCError) {
    if (error.status === ResponseType.InternalServerError) {
      // The server is misconfigured
      return false
    }

    if (
      error.status === ResponseType.InvalidRequest &&
      error.message === 'could not resolve proxy did service url'
    ) {
      // Labeler service not configured in the user's DID document (yet)
      return false
    }

    if (error.status === ResponseType.AuthenticationRequired) {
      // User is logged in with a user that is not member of the labeler's
      // group.
      return false
    }
  }

  return failureCount < 3
}

const retryDelay = (attempt: number, error: unknown): number => {
  if (
    error instanceof XRPCError &&
    error.status === ResponseType.RateLimitExceeded &&
    error.headers?.['ratelimit-remaining'] === '0' &&
    error.headers?.['ratelimit-reset']
  ) {
    // ratelimit-limit: 3000
    // ratelimit-policy: 3000;w=300
    // ratelimit-remaining: 2977
    // ratelimit-reset: 1724927309

    const reset = Number(error.headers['ratelimit-reset']) * 1e3
    return reset - Date.now()
  }

  // Exponential backoff with a maximum of 30 seconds
  return Math.min(1000 * 2 ** attempt, 30000)
}
