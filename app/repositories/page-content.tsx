import { SectionHeader } from '../../components/SectionHeader'
import { RepositoriesTable } from '@/repositories/RepositoriesTable'
import { useSearchParams } from 'next/navigation'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useTitle } from 'react-use'
import { ToolsOzoneModerationDefs } from '@atproto/api'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { ActionButton } from '@/common/buttons'
import { useWorkspaceAddItemsMutation } from '@/workspace/hooks'

const isEmailSearch = (q: string) =>
  q.startsWith('email:') || q.startsWith('ip:')

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

      const email = q.replace('email:', '').replace('ip:', '').trim()

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
  const { mutate: addToWorkspace } = useWorkspaceAddItemsMutation()

  let pageTitle = `Repositories`
  if (q) {
    pageTitle += ` - ${q}`
  }

  useTitle(pageTitle)

  const repos = data?.pages.flatMap((page) => page.repos) ?? []
  return (
    <>
      <SectionHeader
        title="Repositories"
        tabs={[
          {
            key: 'all',
            name: 'All',
            href: `/repositories`,
          },
        ]}
        current="all"
      >
        <div className="flex-1 lg:text-right lg:pr-2 pb-4 px-1 pt-5 lg:pt-0">
          <ActionButton
            size="sm"
            disabled={!repos?.length}
            title={
              !repos.length
                ? 'No users to be added to workspace'
                : 'All visible users in the list will be added to workspace'
            }
            appearance={!!repos.length ? 'primary' : 'outlined'}
            onClick={() => addToWorkspace(repos.map((repo) => repo.did))}
          >
            Add all to workspace
          </ActionButton>
        </div>
      </SectionHeader>

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
