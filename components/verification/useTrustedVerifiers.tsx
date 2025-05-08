import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useQuery } from '@tanstack/react-query'

export const useTrustedVerifiers = () => {
  const labelerAgent = useLabelerAgent()

  const getTrustedVerifiers = async (cursor?: string) => {
    const { data } = await labelerAgent.tools.ozone.moderation.queryStatuses({
      tags: ['trusted-verifier'],
      subjectType: 'account',
      limit: 100,
      cursor,
    })

    return data
  }

  return useQuery({
    queryKey: ['trustedVerifiers'],
    // Trusted verifiers are not expected to change too often so a higher cache time should be fine
    cacheTime: 5 * 60 * 60 * 1000,
    staleTime: 5 * 60 * 60 * 1000,
    queryFn: async () => {
      const { subjectStatuses } = await getTrustedVerifiers()
      return subjectStatuses
    },
    refetchOnWindowFocus: false,
  })
}
