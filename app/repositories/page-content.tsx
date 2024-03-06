import { SectionHeader } from '../../components/SectionHeader'
import { RepositoriesTable } from '@/repositories/RepositoriesTable'
import { useSearchParams } from 'next/navigation'
import { useInfiniteQuery } from '@tanstack/react-query'
import client from '@/lib/client'
import { useEffect } from 'react'
import { useTitle } from 'react-use'

export default function RepositoriesListPage() {
  const params = useSearchParams()
  const term = params.get('term') ?? ''
  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['repositories', { term }],
    queryFn: async ({ pageParam }) => {
      const { data } = await client.api.com.atproto.admin.searchRepos(
        {
          term,
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
  if (term) {
    pageTitle += ` - ${term}`
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
        showEmptySearch={!term?.length && !repos.length}
      />
    </>
  )
}
