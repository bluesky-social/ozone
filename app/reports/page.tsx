'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useInfiniteQuery } from '@tanstack/react-query'
import { SectionHeader } from '../../components/SectionHeader'
import { ModActionIcon } from '../../components/common/ModActionIcon'
import { ReportsTable } from '../../components/reports/ReportsTable'
import { ModActionFormValues, ModActionPanel } from '../actions/ModActionPanel'
import client from '../../lib/client'
import { validSubjectString } from '../../lib/types'
import { takeActionAndResolveReports } from '../../components/reports/helpers/takeActionAndResolveReports'
import { ModActionPanelQuick } from '../actions/ModActionPanel/QuickAction'

const TABS = [
  { key: 'unresolved', name: 'Unresolved', href: '/reports?resolved=false' },
  { key: 'resolved', name: 'Resolved', href: '/reports?resolved=true' },
  { key: 'all', name: 'All', href: '/reports?resolved=' },
]

export default function Reports() {
  const [open, setOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  const params = useSearchParams()
  const subject = params.get('term') ?? undefined // @TODO
  const resolved = params.get('resolved')
    ? params.get('resolved') === 'true'
    : undefined
  const { data, fetchNextPage, hasNextPage, refetch } = useInfiniteQuery({
    queryKey: ['reports', { subject, resolved }],
    queryFn: async ({ pageParam }) => {
      return await getReports({
        subject,
        resolved,
        cursor: pageParam,
      })
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })
  const reports = data?.pages.flatMap((page) => page.reports) ?? []
  const currentTab =
    resolved === undefined ? 'all' : resolved ? 'resolved' : 'unresolved'
  const subjectOptions = unique(
    reports.flatMap((report) => validSubjectString(report.subject) ?? []),
  )
  return (
    <>
      <SectionHeader title="Reports" tabs={TABS} current={currentTab}>
        <div className="flex-1 text-right lg:pr-2 pb-4 px-1">
        <button
            role="button"
            className="flex-1 text-gray-500 hover:text-amber-600 whitespace-nowrap font-medium text-sm align-text-bottom mr-4"
            onClick={() => setQuickOpen(true)}
          >
            Quick Take Action <ModActionIcon className="h-4 w-4 align-text-bottom" />
          </button>
          <button
            role="button"
            className="flex-1 text-gray-500 hover:text-amber-600 whitespace-nowrap font-medium text-sm align-text-bottom"
            onClick={() => setOpen(true)}
          >
            Take Action <ModActionIcon className="h-4 w-4 align-text-bottom" />
          </button>
        </div>
      </SectionHeader>
      <ReportsTable
        reports={reports}
        showLoadMore={!!hasNextPage}
        onLoadMore={fetchNextPage}
      />
      <ModActionPanel
        open={open}
        onClose={() => setOpen(false)}
        subject={subjectOptions.length === 1 ? subjectOptions[0] : undefined}
        subjectOptions={subjectOptions}
        onSubmit={async (vals: ModActionFormValues) => {
          await takeActionAndResolveReports(vals)
          refetch()
        }}
      />
      <ModActionPanelQuick
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        subject={subjectOptions.length >= 1 ? subjectOptions[0] : undefined} // select first subject if there are multiple
        subjectOptions={subjectOptions}
        onSubmit={async (vals: ModActionFormValues) => {
          await takeActionAndResolveReports(vals)
          refetch()
        }}
        goToNextReport={true}
      />
    </>
  )
}

async function getReports(opts: {
  subject?: string
  resolved?: boolean
  cursor?: string
}) {
  const { subject, resolved, cursor } = opts
  const { data } = await client.api.com.atproto.admin.getModerationReports(
    {
      subject,
      resolved,
      cursor,
      limit: 25,
    },
    { headers: client.adminHeaders() },
  )
  return data
}

function unique<T>(arr: T[]) {
  const set = new Set(arr)
  const result: T[] = []
  set.forEach((val) => result.push(val))
  return result
}
