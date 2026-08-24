import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AppBskyActorDefs } from '@atproto/api'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { chunkArray } from '@/lib/util'
import { withRateLimitRetry } from '@/mod-event/helpers/rateLimitRetry'
import { WorkspaceListData } from './useWorkspaceListData'

// app.bsky.actor.getProfiles accepts up to 25 actors per call.
const PROFILES_CHUNK_SIZE = 25

export type PrefetchProgress = { loaded: number; total: number }

/**
 * Warm the per-DID `['repoCard', { did }]` React Query cache that RepoCard /
 * useRepoAndProfile read from — in BULK — so expanding rows (individually or
 * via "expand all") renders instantly without firing per-DID requests.
 *
 * Why this exists: expanding a row mounts a RepoCard, which otherwise fetches
 * getRepo + getProfile *per DID*. Expanding a large workspace therefore fired
 * thousands of un-throttled requests and reliably hit rate limits. Here we:
 *   - reuse the `repo` we already have from the workspace load (no getRepo), and
 *   - fetch profiles via getProfiles (plural) 25 at a time, with rate-limit
 *     retry — turning ~2N requests into ~N/25, degrading gracefully on 429.
 *
 * We only pre-populate the cache; RepoCard is untouched, so every other place
 * it's used keeps its existing behaviour.
 */
export const usePrefetchWorkspaceProfiles = () => {
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()
  const [progress, setProgress] = useState<PrefetchProgress>({
    loaded: 0,
    total: 0,
  })
  const [isPrefetching, setIsPrefetching] = useState(false)

  const prefetch = useCallback(
    async (listData: WorkspaceListData) => {
      // Only accounts (DIDs) have profiles; records are previewed differently.
      const dids = Object.values(listData)
        .map((view) => view?.repo?.did)
        .filter((did): did is string => !!did)

      // Skip DIDs already cached (e.g. expanded once, or a prior prefetch).
      const missing = dids.filter(
        (did) => !queryClient.getQueryData(['repoCard', { did }]),
      )

      if (!missing.length) return

      setIsPrefetching(true)
      setProgress({ loaded: 0, total: missing.length })
      let loaded = 0

      try {
        for (const chunk of chunkArray(missing, PROFILES_CHUNK_SIZE)) {
          let profiles: AppBskyActorDefs.ProfileViewDetailed[] = []
          try {
            const { data } = await withRateLimitRetry(() =>
              labelerAgent.app.bsky.actor.getProfiles({ actors: chunk }),
            )
            profiles = data.profiles
          } catch {
            // A failed chunk shouldn't abort the rest; those rows will simply
            // fetch on demand when expanded. Continue with the next chunk.
          }

          const profileByDid = new Map(profiles.map((p) => [p.did, p]))

          for (const did of chunk) {
            // Seed the exact cache entry RepoCard/useRepoAndProfile reads, using
            // the repo we already have plus the freshly-fetched profile.
            queryClient.setQueryData(['repoCard', { did }], {
              repo: listData[did]?.repo,
              profile: profileByDid.get(did),
            })
          }

          loaded += chunk.length
          setProgress({ loaded, total: missing.length })
        }
      } finally {
        setIsPrefetching(false)
      }
    },
    [labelerAgent, queryClient],
  )

  return { prefetch, progress, isPrefetching }
}
