import { chunkArray, getDidFromUri, pluralize } from '@/lib/util'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { AtUri, ToolsOzoneVerificationGrantVerifications } from '@atproto/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'

export const useVerifier = () => {
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()

  const grant = useMutation({
    mutationFn: async (
      verifications: ToolsOzoneVerificationGrantVerifications.VerificationInput[],
    ) => {
      let verified = 0
      let failed = 0

      for (const chunk of chunkArray(verifications, 100)) {
        const { data } =
          await labelerAgent.tools.ozone.verification.grantVerifications({
            verifications: chunk,
          })

        data.verifications.forEach((v) => {
          queryClient.invalidateQueries(['modActionSubject', v.subject])
        })

        verified += data.verifications.length
        failed += data.failedVerifications.length
      }

      return { verified, failed }
    },
    onSuccess: ({ verified, failed }) => {
      const text: string[] = []
      if (failed > 0) {
        text.push(`${pluralize(failed, 'user')} failed to verify`)
      }
      if (verified > 0) {
        text.push(`${pluralize(verified, 'user')} verified`)
      }
      toast.success(text.join(','))
    },
    onError: (err) => {
      toast.error(`Error verifying user: ${(err as Error).message}`)
    },
  })

  const revoke = useMutation({
    mutationFn: async (uris: string[]) => {
      const data: {
        revokedVerifications: string[]
        failedRevocations: string[]
      } = {
        revokedVerifications: [],
        failedRevocations: [],
      }

      for (const chunk of chunkArray(uris, 100)) {
        const { data: chunkData } =
          await labelerAgent.tools.ozone.verification.revokeVerifications({
            uris: chunk,
          })
        chunkData.revokedVerifications.forEach((uri) => {
          queryClient.invalidateQueries([
            'modActionSubject',
            getDidFromUri(uri),
          ])
          data.revokedVerifications.push(uri)
        })
        data.failedRevocations.push(
          ...chunkData.failedRevocations.map((item) => item.uri),
        )
      }

      return data
    },
    onSuccess: ({ revokedVerifications, failedRevocations }) => {
      const text: string[] = []
      if (failedRevocations.length > 0) {
        text.push(
          `${pluralize(
            failedRevocations.length,
            'verification',
          )} failed to revoke`,
        )
      }
      if (revokedVerifications.length > 0) {
        text.push(
          `${pluralize(revokedVerifications.length, 'verification')} revoked`,
        )
      }
      toast.success(text.join(', '))
    },
    onError: (err) => {
      toast.error(`Error revoking verifications: ${(err as Error).message}`)
    },
  })

  return { grant, revoke }
}
