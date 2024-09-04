import { Agent } from '@atproto/api'
import { ResponseType, XRPCError } from '@atproto/xrpc'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useLocalStorage } from 'react-use'

import { parseServerConfig, ServerConfig } from '@/lib/server-config'

export function useServerConfigQuery(agent: Agent) {
  const [cachedServerConfig, setCachedServerConfig] =
    useLocalStorage<ServerConfig>('labeler-server-config')

  const response = useQuery({
    retry: (failureCount, error): boolean => {
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

        if (error.status === ResponseType.AuthRequired) {
          // User is logged in with a user that is not member of the labeler's
          // group.
          return false
        }
      }

      return failureCount < 3
    },
    retryDelay: (attempt, error) => {
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
    },
    queryKey: ['server-config', agent.assertDid, agent.proxy],
    queryFn: async ({ signal }) => {
      const { data } = await agent.tools.ozone.server.getConfig({}, { signal })
      return parseServerConfig(data)
    },
    initialData: cachedServerConfig,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (response.data) setCachedServerConfig(response.data)
  }, [response.data, setCachedServerConfig])

  return response
}
