import { useQuery } from '@tanstack/react-query'
import { ToolsOzoneModerationDefs } from '@atproto/api'
import { useLabelerAgent } from '@/shell/ConfigurationContext'

export const useSubjectStatus = ({ subject }: { subject: string | null }) => {
  const labelerAgent = useLabelerAgent()
  return useQuery({
    queryKey: ['moderationStatus', { subject }],
    cacheTime: 60 * 1000,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!subject) return null
      const { data } =
        await labelerAgent.tools.ozone.moderation.queryStatuses({
          subject,
          includeMuted: true,
          limit: 1,
        })
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
export const useSubjectStatuses = ({
  subjects,
  enabled,
}: {
  subjects: string[]
  enabled: boolean
}) => {
  const labelerAgent = useLabelerAgent()
  return useQuery({
    enabled,
    queryKey: ['moderationStatuses', subjects],
    cacheTime: 60 * 1000,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const statusBySubject: StatusBySubject = {}
      await Promise.allSettled(
        subjects.map((subject) => {
          return labelerAgent.tools.ozone.moderation
            .queryStatuses({ subject, includeMuted: true, limit: 1 })
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
