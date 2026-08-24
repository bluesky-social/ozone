import { chunkArray } from '@/lib/util'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { Agent, ToolsOzoneModerationDefs } from '@atproto/api'
import { useQuery } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { toast } from 'react-toastify'

export type WorkspaceListData = Record<
  string,
  ToolsOzoneModerationDefs.SubjectView
>

export const WORKSPACE_SUBJECTS_CHUNK_SIZE = 50

/**
 * How long fetched metadata is considered fresh. Within this window, add/remove
 * work incrementally off the cache; once it's exceeded, the next interaction (or
 * a return-to-tab) repolls the whole list. Timed from when a load *finishes*, so
 * a slow initial load doesn't shorten the window. 5 min balances not disrupting
 * active curation of a large batch against not acting on badly stale data.
 */
const STALE_MS = 5 * 60 * 1000

/**
 * Fetch subject metadata in chunks, reporting progress after each chunk.
 *
 * Extracted as a pure function (no React/context) so the chunking + progress
 * behaviour can be tested directly with a fake agent, and so the hook can
 * surface how far along the load is.
 *
 * @param onProgress called after every chunk with (loadedCount, totalCount)
 */
export const fetchSubjectsInChunks = async (
  labelerAgent: Agent,
  subjects: string[],
  onProgress?: (loaded: number, total: number) => void,
) => {
  const results: ToolsOzoneModerationDefs.SubjectView[] = []
  let loaded = 0
  for (const chunk of chunkArray(subjects, WORKSPACE_SUBJECTS_CHUNK_SIZE)) {
    const { data } = await labelerAgent.tools.ozone.moderation.getSubjects({
      subjects: chunk,
    })
    results.push(...data.subjects)
    loaded += chunk.length
    onProgress?.(loaded, subjects.length)
  }

  return results
}

export type WorkspaceLoadProgress = {
  /** Subjects whose metadata has been fetched so far. */
  loaded: number
  /** Total subjects to fetch. */
  total: number
}

export const useWorkspaceListData = ({
  subjects,
  enabled,
}: {
  subjects: string[]
  enabled: boolean
}) => {
  const labelerAgent = useLabelerAgent()
  const [progress, setProgress] = useState<WorkspaceLoadProgress>({
    loaded: 0,
    total: 0,
  })
  // Persistent per-subject cache across renders. Because the query key is the
  // full subjects array, adding/removing a single item would otherwise refetch
  // metadata for the ENTIRE workspace. Keeping already-fetched subjects here
  // means we only ever fetch the ones we don't already have: removing an item
  // does zero network work, adding one fetches just that one.
  const cacheRef = useRef<WorkspaceListData>({})
  const lastFetchAtRef = useRef<number>(0)

  const query = useQuery({
    enabled,
    queryKey: ['workspaceListData', subjects],
    cacheTime: STALE_MS,
    staleTime: STALE_MS,
    // Also refetch when the user returns to the tab (React Query default), so a
    // long-idle panel freshens on focus once the data is stale.
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const errorCount = { repos: 0, records: 0 }

      if (!subjects.length) {
        return {}
      }

      // One unified freshness rule for EVERY trigger (add, remove, focus):
      // if the cached data is older than the stale window, drop the cache so we
      // repoll the whole list; otherwise work incrementally off the cache.
      // The clock starts when a load FINISHES (see lastFetchAtRef below), so a
      // slow initial load of many subjects doesn't eat into the fresh window.
      const isStale = Date.now() - lastFetchAtRef.current >= STALE_MS
      if (isStale) {
        cacheRef.current = {}
      }

      // Only fetch subjects we don't already have cached.
      const subjectSet = new Set(subjects)
      const missing = subjects.filter((sub) => !cacheRef.current[sub])

      if (missing.length) {
        setProgress({ loaded: 0, total: missing.length })
        const data = await fetchSubjectsInChunks(
          labelerAgent,
          missing,
          (loaded, total) => setProgress({ loaded, total }),
        )
        for (const sub of data) {
          cacheRef.current[sub.subject] = sub
        }
        // Record when we last hit the network, to gate focus-refresh.
        lastFetchAtRef.current = Date.now()
      } else {
        // Nothing to fetch (e.g. an item was just removed) — no spinner.
        setProgress({ loaded: 0, total: 0 })
      }

      // Drop cache entries for subjects no longer in the workspace so the
      // cache can't grow unbounded across a long session.
      for (const key of Object.keys(cacheRef.current)) {
        if (!subjectSet.has(key)) {
          delete cacheRef.current[key]
        }
      }

      // Build the result view from cache, in the current subject order.
      const dataBySubject: WorkspaceListData = {}
      for (const sub of subjects) {
        if (cacheRef.current[sub]) {
          dataBySubject[sub] = cacheRef.current[sub]
        }
      }

      // Only count/report failures among subjects we actually just tried to
      // fetch, so removing an item doesn't re-toast pre-existing failures.
      for (const sub of missing) {
        if (dataBySubject[sub]) {
          continue
        }
        if (sub.startsWith('did:')) {
          errorCount.repos++
        } else {
          errorCount.records++
        }
      }

      if (errorCount.repos > 0 || errorCount.records > 0) {
        let counts: string[] = []
        if (errorCount.repos) {
          counts.push(`accounts`)
        }
        if (errorCount.records) {
          counts.push(`records`)
        }
        toast.error(`Failed to load some ${counts.join(' and ')}`)
      }

      return dataBySubject
    },
  })

  return Object.assign(query, { progress })
}
