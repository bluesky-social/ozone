'use client'
import { useSearchParams } from 'next/navigation'
import { useInfiniteQuery } from '@tanstack/react-query'
import { SectionHeader } from '../../components/SectionHeader'
import { RepositoriesTable } from '../../components/repositories/RepositoriesTable'
import client from '../../lib/client'

const TABS = [{ key: 'all', name: 'All', href: '/repositories' }]

export default function Repositories() {
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
        { headers: client.adminHeaders() },
      )
      return data
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })
  const repos = data?.pages.flatMap((page) => page.repos) ?? []
  return (
    <>
      <SectionHeader title="Repositories" tabs={TABS} current="all" />
      <RepositoriesTable
        repos={repos}
        showLoadMore={!!hasNextPage}
        onLoadMore={fetchNextPage}
      />
    </>
  )
}
