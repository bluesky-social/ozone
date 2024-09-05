import { DOMAINS_ALLOWING_EMAIL_COMMUNICATION } from '@/lib/constants'
import { resolveDidDocData } from '@/lib/identity'
import { useQuery } from '@tanstack/react-query'

export const useEmailRecipientStatus = (
  did: string,
): { isLoading: boolean; error: any; cantReceive: boolean } => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['email-capability-check', did],
    queryFn: async () => {
      const response = await resolveDidDocData(did)
      if (!response?.services) {
        return false
      }

      const pdsEndpoint = response.services['atproto_pds']?.endpoint
      if (!pdsEndpoint) {
        return false
      }

      return DOMAINS_ALLOWING_EMAIL_COMMUNICATION.some((domain) => {
        return pdsEndpoint.endsWith(domain)
      })
    },
  })

  return {
    isLoading,
    error,
    // we only know for sure that the recipient can't receive emails if the result of the query is false is false
    cantReceive: data === false,
  }
}
