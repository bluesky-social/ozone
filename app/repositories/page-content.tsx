import { SectionHeader } from '../../components/SectionHeader'
import { RepositoriesTable } from '@/repositories/RepositoriesTable'
import { useSearchParams } from 'next/navigation'
import { useInfiniteQuery } from '@tanstack/react-query'
import client from '@/lib/client'
import { useTitle } from 'react-use'

export default function RepositoriesListPage() {
  const params = useSearchParams()
  const q = params.get('term') ?? ''
  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['repositories', { q }],
    queryFn: async ({ pageParam }) => {
      const { data } = await client.api.tools.ozone.moderation.searchRepos(
        {
          q,
          limit: 25,
          cursor: pageParam,
        },
        { headers: client.proxyHeaders() },
      )
      return data
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
        onLoadMore={fetchNextPage}
        showLoadMore={!!hasNextPage}
        showEmptySearch={!q?.length && !repos.length}
      />
    </>
  )
}
