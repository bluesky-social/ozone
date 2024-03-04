import client from '@/lib/client'
import { useQuery } from '@tanstack/react-query'

export const useRepoAndProfile = ({ id }: { id: string }) =>
  useQuery({
    queryKey: ['accountView', { id }],
    queryFn: async () => {
      const getRepo = async () => {
        let did
        if (id.startsWith('did:')) {
          did = id
        } else {
          const { data: resolved } =
            await client.api.com.atproto.identity.resolveHandle(
              { handle: id },
              { headers: client.proxyHeaders() },
            )
          did = resolved.did
        }
        const { data: repo } = await client.api.com.atproto.admin.getRepo(
          { did },
          { headers: client.proxyHeaders() },
        )
        return repo
      }
      const getProfile = async () => {
        try {
          const { data: profile } = await client.api.app.bsky.actor.getProfile(
            {
              actor: id,
            },
            { headers: client.proxyHeaders() },
          )
          return profile
        } catch (err) {
          if (err?.['error'] === 'AccountTakedown') {
            return undefined
          }
          throw err
        }
      }
      const [repo, profile] = await Promise.all([getRepo(), getProfile()])
      return { repo, profile }
    },
    staleTime: 5 * 60 * 1000,
  })
