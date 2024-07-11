import { getDidFromHandle } from '@/lib/identity'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useQuery } from '@tanstack/react-query'

export const useRepoAndProfile = ({ id }: { id: string }) => {
  const labelerAgent = useLabelerAgent()
  return useQuery({
    queryKey: ['accountView', { id }],
    queryFn: async () => {
      const getRepo = async () => {
        let did
        if (id.startsWith('did:')) {
          did = id
        } else {
          did = await getDidFromHandle(id)
        }
        const { data: repo } =
          await labelerAgent.api.tools.ozone.moderation.getRepo({ did })
        return repo
      }
      const getProfile = async () => {
        try {
          const { data: profile } =
            await labelerAgent.api.app.bsky.actor.getProfile({ actor: id })
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
}
