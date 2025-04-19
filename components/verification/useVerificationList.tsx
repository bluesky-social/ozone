import { useLabelerAgent, useServerConfig } from '@/shell/ConfigurationContext'
import { useInfiniteQuery } from '@tanstack/react-query'

export const useVerificationList = ({
  issuers,
  isRevoked,
  createdAfter,
  createdBefore,
}: {
  issuers?: string[]
  isRevoked?: boolean
  createdBefore?: string
  createdAfter?: string
}) => {
  const serverConfig = useServerConfig()
  const labelerAgent = useLabelerAgent()
  return useInfiniteQuery({
    enabled: !!serverConfig.verifierDid,
    queryKey: ['verification-list', issuers, createdBefore, createdAfter],
    queryFn: async () => {
      const { data } = await labelerAgent.tools.ozone.verification.list({
        issuers,
        isRevoked,
        createdAfter,
        createdBefore,
        limit: 100,
      })
      return data
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })
}
