'use client'
import { useContext, useCallback, Suspense } from 'react'
import {
  ReadonlyURLSearchParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation'
import { useInfiniteQuery } from '@tanstack/react-query'
import {
  ComAtprotoAdminDefs,
  ComAtprotoAdminEmitModerationEvent,
  ComAtprotoAdminQueryModerationStatuses,
} from '@atproto/api'
import { SectionHeader } from '../../components/SectionHeader'
import { ModActionIcon } from '@/common/ModActionIcon'
import { useSyncedState } from '@/lib/useSyncedState'
import client from '@/lib/client'
import { validSubjectString } from '@/lib/types'
import { emitEvent } from '@/mod-event/helpers/emitEvent'
import { ModActionPanelQuick } from '../actions/ModActionPanel/QuickAction'
import { AuthContext } from '@/shell/AuthContext'
import { ButtonGroup } from '@/common/buttons'
import { useFluentReportSearch } from '@/reports/useFluentReportSearch'
import { SubjectTable } from 'components/subject/table'

const TABS = [
  {
    key: 'unresolved',
    name: 'Unresolved',
    href: `/reports?reviewState=${encodeURIComponent(
      ComAtprotoAdminDefs.REVIEWOPEN,
    )}`,
  },
  {
    key: 'escalated',
    name: 'Escalated',
    href: `/reports?reviewState=${encodeURIComponent(
      ComAtprotoAdminDefs.REVIEWESCALATED,
    )}`,
  },
  {
    key: 'resolved',
    name: 'Resolved',
    href: `/reports?reviewState=${encodeURIComponent(
      ComAtprotoAdminDefs.REVIEWCLOSED,
    )}`,
  },
  { key: 'all', name: 'All', href: '/reports' },
]

const ResolvedFilters = () => {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const takendown = params.get('takendown')
  const includeMuted = params.get('includeMuted')

  const updateParams = useCallback(
    (key: string, newState: boolean) => {
      const nextParams = new URLSearchParams(params)
      if (nextParams.get(key) == `${newState}`) {
        nextParams.delete(key)
      } else {
        nextParams.set(key, `${newState}`)
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
        // TODO: Don't think we need ack and flagged status filters?
        {
          id: 'takendown',
          text: 'Taken Down',
          onClick: () => updateParams('takendown', true),
          isActive: takendown === 'true',
        },
        {
          id: 'includeMuted',
          text: 'Show Muted',
          onClick: () => updateParams('includeMuted', true),
          isActive: includeMuted === 'true',
        },
      ]}
    />
  )
}

const getSortParams = (params: ReadonlyURLSearchParams) => {
  let sortField = params.get('sortField')
  let sortDirection = params.get('sortDirection')

  if (!['asc', 'desc'].includes(sortDirection ?? '')) {
    sortDirection = 'desc'
  }

  if (!['lastReportedAt', 'lastReviewedAt'].includes(sortField ?? '')) {
    sortField = 'lastReportedAt'
  }

  return { sortField, sortDirection }
}

export const ReportsPageContent = () => {
  const params = useSearchParams()
  const [quickOpenParam, setQuickOpenParam] = useSyncedState(
    params.get('quickOpen') ?? '',
  )
  const takendown = !!params.get('takendown')
  const includeMuted = !!params.get('includeMuted')
  const reviewState = params.get('reviewState')
  const { sortField, sortDirection } = getSortParams(params)
  const { getReportSearchParams } = useFluentReportSearch()
  const { lastReviewedBy, subject, reporters } = getReportSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const setQuickActionPanelSubject = (subject: string) => {
    const searchParams = new URLSearchParams(params)
    if (!subject) {
      searchParams.delete('quickOpen')
    } else {
      searchParams.set('quickOpen', subject)
    }
    router.push((pathname ?? '') + '?' + searchParams.toString())
    setQuickOpenParam(subject)
  }

  const { isLoggedIn } = useContext(AuthContext)
  const { data, fetchNextPage, hasNextPage, refetch, isInitialLoading } =
    useInfiniteQuery({
      enabled: isLoggedIn,
      queryKey: [
        'events',
        {
          subject,
          sortField,
          sortDirection,
          reviewState,
          lastReviewedBy,
          reporters,
          takendown,
        },
      ],
      queryFn: async ({ pageParam }) => {
        const queryParams: Parameters<typeof getModerationQueue>[0] = {
          cursor: pageParam,
        }

        if (subject) {
          queryParams.subject = subject
        }

        if (takendown) {
          queryParams.takendown = takendown
        }

        if (includeMuted) {
          queryParams.includeMuted = includeMuted
        }

        // For these fields, we only want to add them to the filter if the values are set, otherwise, defaults will kick in
        Object.entries({ sortField, sortDirection, reviewState }).forEach(
          ([key, value]) => {
            if (value) {
              queryParams[key] = value
            }
          },
        )

        return await getModerationQueue(queryParams)
      },
      getNextPageParam: (lastPage) => lastPage.cursor,
    })
  const subjectStatuses =
    data?.pages.flatMap((page) => page.subjectStatuses) ?? []
  const currentTab = getTabFromParams({ reviewState })
  const subjectOptions = unique(
    subjectStatuses.flatMap(
      (report) => validSubjectString(report.subject) ?? [],
    ),
  )

  return (
    <>
      <SectionHeader title="Queue" tabs={TABS} current={currentTab}>
        <div className="flex-1 lg:text-right lg:pr-2 pb-4 px-1 pt-5 lg:pt-0">
          <button
            role="button"
            className="flex-1 text-gray-500 hover:text-amber-600 whitespace-nowrap font-medium text-sm align-text-bottom"
            onClick={() => setQuickActionPanelSubject(subjectOptions[0] ?? '')}
          >
            Quick <span className="hidden md:inline-block">Take</span> Action{' '}
            <ModActionIcon className="h-4 w-4 align-text-bottom" />
          </button>
        </div>
      </SectionHeader>
      <div className="flex mt-2 mb-2 flex-row justify-end px-4 sm:px-6 lg:px-8">
        <Suspense fallback={<div></div>}>
          <ResolvedFilters />
        </Suspense>
      </div>
      <SubjectTable
        subjectStatuses={subjectStatuses}
        showLoadMore={!!hasNextPage}
        onLoadMore={fetchNextPage}
        isInitialLoading={isInitialLoading}
      />
      <ModActionPanelQuick
        open={!!quickOpenParam}
        onClose={() => setQuickActionPanelSubject('')}
        setSubject={setQuickActionPanelSubject}
        subject={quickOpenParam} // select first subject if there are multiple
        subjectOptions={subjectOptions}
        isInitialLoading={isInitialLoading}
        onSubmit={async (
          vals: ComAtprotoAdminEmitModerationEvent.InputSchema,
        ) => {
          await emitEvent(vals)
          refetch()
        }}
      />
    </>
  )
}

function getTabFromParams({ reviewState }: { reviewState?: string | null }) {
  const reviewStateMap = {
    [ComAtprotoAdminDefs.REVIEWESCALATED]: 'escalated',
    [ComAtprotoAdminDefs.REVIEWCLOSED]: 'resolved',
    [ComAtprotoAdminDefs.REVIEWOPEN]: 'unresolved',
  }

  if (reviewState) {
    return reviewStateMap[reviewState] || 'all'
  }

  return 'all'
}

async function getModerationQueue(
  opts: ComAtprotoAdminQueryModerationStatuses.QueryParams = {},
) {
  const res = await client.api.com.atproto.admin.queryModerationStatuses(
    {
      limit: 25,
      includeMuted: true,
      ...opts,
    },
    { headers: client.adminHeaders() },
  )
  return res.data
}

function unique<T>(arr: T[]) {
  const set = new Set(arr)
  const result: T[] = []
  set.forEach((val) => result.push(val))
  return result
}
