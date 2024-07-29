import { useQuery } from '@tanstack/react-query'
import client from '@/lib/client'
import { ToolsOzoneModerationDefs } from '@atproto/api'

export const useSubjectStatus = ({ subject }: { subject: string | null }) => {
  return useQuery({
    queryKey: ['moderationStatus', { subject }],
    cacheTime: 60 * 1000,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!subject) return null
      const { data } = await client.api.tools.ozone.moderation.queryStatuses(
        { subject, includeMuted: true, limit: 1 },
        { headers: client.proxyHeaders() },
      )
      return data
    },
  })
}

export type StatusBySubject = Record<
  string,
  ToolsOzoneModerationDefs.SubjectStatusView | null
>

// Ideally, this would be replaced with a bulk fetcher so that we aren't firing 1 req for each subject
// but even with a bulk fetcher, there would probably be some kind of restriction on how many subjects
// we can fetch at once, so we would need some kind of queue/list fetcher anyways
export const useSubjectStatuses = ({ subjects }: { subjects: string[] }) => {
  return useQuery({
    queryKey: ['moderationStatuses', subjects],
    cacheTime: 60 * 1000,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const statusBySubject: StatusBySubject = {}
      await Promise.allSettled(
        subjects.map((subject) => {
          return client.api.tools.ozone.moderation
            .queryStatuses(
              { subject, includeMuted: true, limit: 1 },
              { headers: client.proxyHeaders() },
            )
            .then(({ data }) => {
              if (data?.subjectStatuses[0]) {
                statusBySubject[subject] = data.subjectStatuses[0]
              } else {
                statusBySubject[subject] = null
              }
            })
            .catch((err) => {
              statusBySubject[subject] = null
              console.error(err)
            })
        }),
      )

      return statusBySubject
    },
  })
}
