'use client'
import { useState, useContext } from 'react'
import { useSearchParams } from 'next/navigation'
import { useInfiniteQuery } from '@tanstack/react-query'
import { ComAtprotoAdminDefs } from '@atproto/api'
import { SectionHeader } from '../../components/SectionHeader'
import { ModActionIcon } from '../../components/common/ModActionIcon'
import { ReportsTable } from '../../components/reports/ReportsTable'
import { SnoozeListPopup } from '../../components/reports/SnoozeListPopup'
import { ModActionFormValues, ModActionPanel } from '../actions/ModActionPanel'
import { useSyncedState } from '../../lib/useSyncedState'
import client from '../../lib/client'
import { validSubjectString } from '../../lib/types'
import { takeActionAndResolveReports } from '../../components/reports/helpers/takeActionAndResolveReports'
import {
  snoozeSubject,
  getSnoozedSubjects,
} from '../../components/reports/helpers/snoozeSubject'
import { ModActionPanelQuick } from '../actions/ModActionPanel/QuickAction'
import { AuthContext, AuthState } from '../../components/shell/AuthContext'

const TABS = [
  {
    key: 'unresolved',
    name: 'Unresolved',
    href: '/reports?resolved=false&actionType=',
  },
  {
    key: 'escalated',
    name: 'Escalated',
    href: `/reports?resolved=&actionType=${encodeURIComponent(
      ComAtprotoAdminDefs.ESCALATE,
    )}`,
  },
  {
    key: 'resolved',
    name: 'Resolved',
    href: '/reports?resolved=true&actionType=',
  },
  { key: 'all', name: 'All', href: '/reports?resolved=&actionType=' },
]

export default function Reports() {
  const params = useSearchParams()
  const [open, setOpen] = useState(false)
  const quickOpenParam = !!params.get('quickOpen')
  const [quickOpen, setQuickOpen] = useSyncedState(quickOpenParam)
  const subject = params.get('term') ?? undefined
  const reverse = !!params.get('reverse')
  const actionType = params.get('actionType')
    ? decodeURIComponent(String(params.get('actionType')))
    : undefined
  const resolved = params.get('resolved')
    ? params.get('resolved') === 'true'
    : undefined
  const { isLoggedIn } = useContext(AuthContext)
  const { data, fetchNextPage, hasNextPage, refetch, isInitialLoading } =
    useInfiniteQuery({
      enabled: isLoggedIn,
      queryKey: ['reports', { subject, resolved, actionType, reverse }],
      queryFn: async ({ pageParam }) => {
        const ignoreSubjects = getSnoozedSubjects()
        return await getReports({
          subject,
          resolved,
          actionType,
          cursor: pageParam,
          ignoreSubjects,
          reverse,
        })
      },
      getNextPageParam: (lastPage) => lastPage.cursor,
    })
  const reports = data?.pages.flatMap((page) => page.reports) ?? []
  const currentTab = getTabFromParams({ resolved, actionType })
  const subjectOptions = unique(
    reports.flatMap((report) => validSubjectString(report.subject) ?? []),
  )
  return (
    <>
      <SectionHeader title="Reports" tabs={TABS} current={currentTab}>
        <div className="flex-1 text-right lg:pr-2 pb-4 px-1">
          <SnoozeListPopup onChange={() => refetch()} />
          <button
            role="button"
            className="flex-1 text-gray-500 hover:text-amber-600 whitespace-nowrap font-medium text-sm align-text-bottom mr-4"
            onClick={() => setQuickOpen(true)}
          >
            Quick Take Action{' '}
            <ModActionIcon className="h-4 w-4 align-text-bottom" />
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
        isInitialLoading={isInitialLoading}
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
        onSnooze={(vals: { snoozeDuration: number; subject: string }) => {
          snoozeSubject(vals)
          refetch()
        }}
      />
      <ModActionPanelQuick
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        subject={subjectOptions.length >= 1 ? subjectOptions[0] : undefined} // select first subject if there are multiple
        subjectOptions={subjectOptions}
        isInitialLoading={isInitialLoading}
        onSubmit={async (vals: ModActionFormValues) => {
          await takeActionAndResolveReports(vals)
          refetch()
        }}
        onSnooze={(vals: { snoozeDuration: number; subject: string }) => {
          snoozeSubject(vals)
          refetch()
        }}
      />
    </>
  )
}

function getTabFromParams(params: { resolved?: boolean; actionType?: string }) {
  const { resolved, actionType } = params
  if (resolved === undefined && actionType === ComAtprotoAdminDefs.ESCALATE) {
    return 'escalated'
  } else if (resolved === true && actionType === undefined) {
    return 'resolved'
  } else if (resolved === false && actionType === undefined) {
    return 'unresolved'
  } else {
    return 'all'
  }
}

async function getReports(
  opts: Parameters<
    typeof client.api.com.atproto.admin.getModerationReports
  >[0] = {},
) {
  const { subject, resolved, actionType, cursor, reverse, ignoreSubjects } =
    opts
  const { data } = await client.api.com.atproto.admin.getModerationReports(
    {
      subject,
      resolved,
      cursor,
      actionType,
      limit: 25,
      ignoreSubjects,
      reverse,
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
