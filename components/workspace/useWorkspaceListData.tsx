import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { ToolsOzoneModerationDefs } from '@atproto/api'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'react-toastify'

export type WorkspaceListData = Record<
  string,
  ToolsOzoneModerationDefs.SubjectView
>

export const useWorkspaceListData = ({
  subjects,
  enabled,
}: {
  subjects: string[]
  enabled: boolean
}) => {
  const labelerAgent = useLabelerAgent()
  return useQuery({
    enabled,
    queryKey: ['workspaceListData', subjects],
    cacheTime: 60 * 1000,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const errorCount = { repos: 0, records: 0 }
      const dataBySubject: WorkspaceListData = {}

      if (!subjects.length) {
        return dataBySubject
      }

      const { data } = await labelerAgent.tools.ozone.moderation.getSubjects({
        subjects,
      })

      for (const sub of data.subjects) {
        dataBySubject[sub.subject] = sub
      }

      for (const sub of subjects) {
        if (dataBySubject[sub]) {
          continue
        }
        if (sub.startsWith('did:')) {
          errorCount.repos++
        } else {
          errorCount.records++
        }
      }

      if (errorCount.repos > 0 || errorCount.records > 0) {
        let counts: string[] = []
        if (errorCount.repos) {
          counts.push(`accounts`)
        }
        if (errorCount.records) {
          counts.push(`records`)
        }
        toast.error(`Failed to load some ${counts.join(' and ')}`)
      }

      return dataBySubject
    },
  })
}
