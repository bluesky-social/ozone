import { chunkArray } from '@/lib/util'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { ToolsOzoneModerationDefs } from '@atproto/api'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'react-toastify'

// Technically, we could allow RepoViewNotFound and RecordViewNotFound but we don't show specific info for those cases anyways
export type WorkspaceListItemData =
  | ToolsOzoneModerationDefs.RepoViewDetail
  | ToolsOzoneModerationDefs.RecordViewDetail
  | ToolsOzoneModerationDefs.SubjectStatusView

export type WorkspaceListData = Record<string, WorkspaceListItemData>

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
      const repos: string[] = []
      const records: string[] = []
      const notFound: string[] = []

      subjects.forEach((subject) => {
        if (subject.startsWith('did:')) {
          repos.push(subject)
        } else {
          records.push(subject)
        }
      })

      const getRecords = chunkArray(records, 50).map(async (uris) => {
        try {
          const { data } = await labelerAgent.tools.ozone.moderation.getRecords(
            {
              uris,
            },
          )

          data.records.forEach((record) => {
            if (ToolsOzoneModerationDefs.isRecordViewDetail(record)) {
              dataBySubject[record.uri] = record
            } else if (ToolsOzoneModerationDefs.isRecordViewNotFound(record)) {
              notFound.push(record.uri)
            }
          })
        } catch (err) {
          // if a batch fails to load, let's not fail the whole queue
          // instead just show the error to the user
          errorCount.records++
        }
      })

      const getRepos = chunkArray(repos, 50).map(async (dids) => {
        try {
          const { data } = await labelerAgent.tools.ozone.moderation.getRepos({
            dids,
          })

          data.repos.forEach((repo) => {
            // If the repo is not found or any other type, we can assume it's just not found or non-existent
            if (ToolsOzoneModerationDefs.isRepoViewDetail(repo)) {
              dataBySubject[repo.did] = repo
            } else if (ToolsOzoneModerationDefs.isRepoViewNotFound(repo)) {
              notFound.push(repo.did)
            }
          })
        } catch (err) {
          // if a batch fails to load, let's not fail the whole queue
          // instead just show the error to the user
          errorCount.repos++
        }
      })

      const getSubjectStatus = async (subject: string) => {
        try {
          const { data } =
            await labelerAgent.tools.ozone.moderation.queryStatuses({
              subject,
              limit: 1,
              includeMuted: true,
            })

          if (data.subjectStatuses?.length) {
            dataBySubject[subject] = data.subjectStatuses[0]
          }
        } catch (err) {
          // if a batch fails to load, let's not fail the whole queue
          // instead just show the error to the user
          errorCount.repos++
        }
      }

      await Promise.all([...getRepos, ...getRecords])
      // For items that we couldn't find record/repo for, there's a chance those are removed
      // but they do have moderation history so we want to load subject status for those separately
      // we can only load 1 subject at a time so chunking the entire not found set into buckets
      // to ensure that we only ever fire 50 reqs at a time
      for (const notFoundSubjects of chunkArray(notFound, 50)) {
        await Promise.all(notFoundSubjects.map(getSubjectStatus))
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
