import client from '@/lib/client'
import { useQuery } from '@tanstack/react-query'

export const useSearchActorsTypeahead = (query: string) => {
  const q = query.startsWith('@') ? query.slice(1) : query
  return useQuery({
    queryKey: ['searchActorsTypeahead', { q }],
    cacheTime: 1000 * 60 * 5,
    queryFn: async () => {
      // don't make request for empty query string
      if (!q) return []
      const { data } = await client.api.app.bsky.actor.searchActorsTypeahead(
        { q },
        { headers: client.proxyHeaders() },
      )
      return data.actors
    },
  })
}
