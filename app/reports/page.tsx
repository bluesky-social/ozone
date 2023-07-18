'use client'
import { useState, useContext, useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useInfiniteQuery } from '@tanstack/react-query'
import { ComAtprotoAdminDefs } from '@atproto/api'
import { SectionHeader } from '../../components/SectionHeader'
import { ModActionIcon } from '@/common/ModActionIcon'
import { ReportsTable } from '@/reports/ReportsTable'
import { SnoozeListPopup } from '@/reports/SnoozeListPopup'
import { ModActionFormValues, ModActionPanel } from '../actions/ModActionPanel'
import { useSyncedState } from '@/lib/useSyncedState'
import client from '@/lib/client'
import { validSubjectString } from '@/lib/types'
import { takeActionAndResolveReports } from '@/reports/helpers/takeActionAndResolveReports'
import {
  snoozeSubject,
  getSnoozedSubjects,
} from '@/reports/helpers/snoozeSubject'
import { ModActionPanelQuick } from '../actions/ModActionPanel/QuickAction'
import { AuthContext } from '@/shell/AuthContext'
import { ButtonGroup } from '@/common/buttons'
import { useFluentReportSearch } from '@/reports/useFluentReportSearch'

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

const ResolvedFilters = () => {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const actionType = params.get('actionType')

  const updateParams = useCallback(
    (type: string) => {
      const nextParams = new URLSearchParams(params)
      if (nextParams.get('actionType') === type) {
        nextParams.delete('actionType')
      } else {
        nextParams.set('actionType', type)
      }
      router.push((pathname ?? '') + '?' + nextParams.toString())
    },
    [params, pathname, router],
  )

  return (
    <ButtonGroup
      size="xs"
      appearance="primary"
      items={[
        {
          id: 'acknowldedged',
          text: 'Acknowledged',
          onClick: () => updateParams(ComAtprotoAdminDefs.ACKNOWLEDGE),
          isActive: actionType === ComAtprotoAdminDefs.ACKNOWLEDGE,
        },
        {
          id: 'flagged',
          text: 'Flagged',
          onClick: () => updateParams(ComAtprotoAdminDefs.FLAG),
          isActive: actionType === ComAtprotoAdminDefs.FLAG,
        },
        {
          id: 'takendown',
          text: 'Taken Down',
          onClick: () => updateParams(ComAtprotoAdminDefs.TAKEDOWN),
          isActive: actionType === ComAtprotoAdminDefs.TAKEDOWN,
        },
      ]}
    />
  )
}

export default function Reports() {
  const params = useSearchParams()
  const [open, setOpen] = useState(false)
  const quickOpenParam = !!params.get('quickOpen')
  const [quickOpen, setQuickOpen] = useSyncedState(quickOpenParam)
  const reverse = !!params.get('reverse')
  const actionType = params.get('actionType')
    ? decodeURIComponent(String(params.get('actionType')))
    : undefined
  const resolved = params.get('resolved')
    ? params.get('resolved') === 'true'
    : undefined
  const {getReportSearchParams} = useFluentReportSearch();
  const {actionedBy, subject} = getReportSearchParams();

  const { isLoggedIn } = useContext(AuthContext)
  const { data, fetchNextPage, hasNextPage, refetch, isInitialLoading } =
    useInfiniteQuery({
      enabled: isLoggedIn,
      queryKey: [
        'reports',
        { subject, resolved, actionType, reverse, actionedBy },
      ],
      queryFn: async ({ pageParam }) => {
        const ignoreSubjects = getSnoozedSubjects()
        return await getReports({
          subject,
          resolved,
          actionType,
          cursor: pageParam,
          ignoreSubjects,
          actionedBy,
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
  const shouldShowActionFilterTab = ['resolved', 'all'].includes(currentTab)

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
      {shouldShowActionFilterTab && (
        <div className="flex mt-2 mb-2 flex-row justify-end px-4 sm:px-6 lg:px-8">
          <ResolvedFilters />
        </div>
      )}
      <ReportsTable
        reports={reports}
        showLoadMore={!!hasNextPage}
        onLoadMore={fetchNextPage}
        isInitialLoading={isInitialLoading}
        className={!shouldShowActionFilterTab ? 'mt-8' : ''}
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
  } else if (resolved === true) {
    return 'resolved'
  } else if (resolved === false) {
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
  const {
    subject,
    resolved,
    actionType,
    cursor,
    reverse,
    ignoreSubjects,
    actionedBy,
  } = opts
  const { data } = await client.api.com.atproto.admin.getModerationReports(
    {
      subject,
      resolved,
      cursor,
      actionType,
      limit: 25,
      ignoreSubjects,
      reverse,
      actionedBy,
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
