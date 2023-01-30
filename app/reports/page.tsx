'use client'
import { useSearchParams } from 'next/navigation'
import { useInfiniteQuery } from '@tanstack/react-query'
import { SectionHeader } from '../../components/SectionHeader'
import { ReportsTable } from '../../components/reports/ReportsTable'
import client from '../../lib/client'

const TABS = [
  { key: 'unresolved', name: 'Unresolved', href: '/reports?resolved=false' },
  { key: 'resolved', name: 'Resolved', href: '/reports?resolved=true' },
  { key: 'all', name: 'All', href: '/reports?resolved=' },
]

export default function Reports() {
  const params = useSearchParams()
  const subject = params.get('term') ?? undefined // @TODO
  const resolved = params.get('resolved')
    ? params.get('resolved') === 'true'
    : undefined
  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['reports', { subject, resolved }],
    queryFn: async ({ pageParam }) => {
      const { data } = await client.api.com.atproto.admin.getModerationReports(
        {
          subject,
          resolved,
          limit: 25,
          before: pageParam,
        },
        { headers: client.adminHeaders() },
      )
      return data
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })
  const reports = data?.pages.flatMap((page) => page.reports) ?? []
  const currentTab =
    resolved === undefined ? 'all' : resolved ? 'resolved' : 'unresolved'
  return (
    <>
      <SectionHeader title="Reports" tabs={TABS} current={currentTab} />
      <ReportsTable
        reports={reports}
        showLoadMore={!!hasNextPage}
        onLoadMore={fetchNextPage}
      />
    </>
  )
}
