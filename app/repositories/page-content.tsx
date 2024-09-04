import { SectionHeader } from '../../components/SectionHeader'
import { RepositoriesTable } from '@/repositories/RepositoriesTable'
import { useSearchParams } from 'next/navigation'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useTitle } from 'react-use'
import { ToolsOzoneModerationDefs } from '@atproto/api'
import { useLabelerAgent } from '@/shell/ConfigurationContext'

const isEmailSearch = (q: string) => q.startsWith('email:')

function useSearchResultsQuery(q: string) {
  const labelerAgent = useLabelerAgent()

  return useInfiniteQuery({
    queryKey: ['repositories', { q }],
    queryFn: async ({ pageParam }) => {
      const limit = 25

      if (!isEmailSearch(q)) {
        const { data } =
          await labelerAgent.api.tools.ozone.moderation.searchRepos({
            q,
            limit,
            cursor: pageParam,
          })

        return data
      }

      const email = q.replace('email:', '').trim()

      if (!email) {
        return { repos: [], cursor: undefined }
      }

      const { data } = await labelerAgent.api.com.atproto.admin.searchAccounts({
        email,
        limit,
        cursor: pageParam,
      })

      if (!data.accounts.length) {
        return { repos: [], cursor: data.cursor }
      }

      const repos: Record<string, ToolsOzoneModerationDefs.RepoView> = {}
      data.accounts.forEach((account) => {
        repos[account.did] = {
          ...account,
          // Set placeholder properties that will be later filled in with data from ozone
          relatedRecords: [],
          indexedAt: account.indexedAt,
          moderation: {},
          labels: [],
        }
      })

      await Promise.allSettled(
        data.accounts.map(async (account) => {
          const { data } =
            await labelerAgent.api.tools.ozone.moderation.getRepo({
              did: account.did,
            })
          repos[account.did] = { ...repos[account.did], ...data }
        }),
      )

      return { repos: Object.values(repos), cursor: data.cursor }
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })
}

export default function RepositoriesListPage() {
  const params = useSearchParams()

  const q = params.get('term') ?? ''

  const { data, fetchNextPage, hasNextPage } = useSearchResultsQuery(q)

  let pageTitle = `Repositories`
  if (q) {
    pageTitle += ` - ${q}`
  }

  useTitle(pageTitle)

  const repos = data?.pages.flatMap((page) => page.repos) ?? []
  return (
    <>
      <SectionHeader title="Repositories" tabs={[]} current="all" />

      <RepositoriesTable
        repos={repos}
        showEmail={isEmailSearch(q)}
        onLoadMore={fetchNextPage}
        showLoadMore={!!hasNextPage}
        showEmptySearch={!q?.length && !repos.length}
      />
    </>
  )
}
