import { SectionHeader } from '../../components/SectionHeader'
import { RepositoriesTable } from '@/repositories/RepositoriesTable'
import { useSearchParams } from 'next/navigation'
import { useInfiniteQuery } from '@tanstack/react-query'
import client from '@/lib/client'
import { useTitle } from 'react-use'
import { ToolsOzoneModerationDefs } from '@atproto/api'

const isEmailSearch = (q: string) => q.startsWith('email:')

const getSearchResults = async ({
  q,
  cursor,
}: {
  q: string
  cursor?: string
}): Promise<{
  cursor?: string
  repos: ToolsOzoneModerationDefs.RepoView[]
}> => {
  const headers = { headers: client.proxyHeaders() }
  const limit = 25

  if (!isEmailSearch(q)) {
    const { data } = await client.api.tools.ozone.moderation.searchRepos(
      { q, limit, cursor },
      headers,
    )

    return data
  }

  const email = q.replace('email:', '').trim()

  if (!email) {
    return { repos: [], cursor: undefined }
  }

  const { data } = await client.api.com.atproto.admin.searchAccounts(
    { email, limit, cursor },
    headers,
  )

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
      const { data } = await client.api.tools.ozone.moderation.getRepo(
        { did: account.did },
        headers,
      )
      repos[account.did] = { ...repos[account.did], ...data }
    }),
  )

  return { repos: Object.values(repos), cursor: data.cursor }
}

export default function RepositoriesListPage() {
  const params = useSearchParams()
  const q = params.get('term') ?? ''
  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['repositories', { q }],
    queryFn: async ({ pageParam }) => {
      return getSearchResults({ q, cursor: pageParam })
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })

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
