import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useQuery } from '@tanstack/react-query'

export const useSearchActorsTypeahead = (query: string) => {
  const labelerAgent = useLabelerAgent()
  const q = query.startsWith('@') ? query.slice(1) : query
  return useQuery({
    queryKey: ['searchActorsTypeahead', { q }],
    cacheTime: 1000 * 60 * 5,
    queryFn: async () => {
      // don't make request for empty query string
      if (!q) return []
      const { data } =
        await labelerAgent.api.app.bsky.actor.searchActorsTypeahead({ q })
      return data.actors
    },
  })
}
