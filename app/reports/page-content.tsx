'use client'
import { useContext, useCallback, Suspense, useEffect } from 'react'
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
  const appealed = params.get('appealed')

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
        {
          id: 'appealed',
          text: 'Appealed',
          onClick: () => updateParams('appealed', true),
          isActive: appealed === 'true',
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
  const quickOpenParam = params.get('quickOpen') ?? ''
  const takendown = !!params.get('takendown')
  const includeMuted = !!params.get('includeMuted')
  const appealed = !!params.get('appealed')
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
          appealed,
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

        if (appealed) {
          queryParams.appealed = appealed
        }

        // For these fields, we only want to add them to the filter if the values are set, otherwise, defaults will kick in
        Object.entries({
          sortField,
          sortDirection,
          reviewState,
          lastReviewedBy,
        }).forEach(([key, value]) => {
          if (value) {
            queryParams[key] = value
          }
        })

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

  useEffect(() => {
    const titleFromTab =
      currentTab === 'all'
        ? `All subjects`
        : `${currentTab[0].toUpperCase()}${currentTab.slice(1)}`
    const additionalFragments: string[] = []

    if (takendown) {
      additionalFragments.push('Taken Down')
    }

    if (includeMuted) {
      additionalFragments.push('Include Muted')
    }

    if (appealed) {
      additionalFragments.push('Appealed')
    }

    const additionalTitle = additionalFragments.length
      ? ` (${additionalFragments.join(', ')})`
      : ''
    const title = `Queue - ${titleFromTab}${additionalTitle}`
    document.title = title
  }, [currentTab, takendown, includeMuted, appealed])

  return (
    <>
      <SectionHeader title="Queue" tabs={TABS} current={currentTab}>
        <div className="flex-1 lg:text-right lg:pr-2 pb-4 px-1 pt-5 lg:pt-0">
          <button
            role="button"
            className="flex-1 text-gray-500 dark:text-gray-50 hover:text-amber-600 dark:hover:text-amber-100 whitespace-nowrap font-medium text-sm align-text-bottom"
            onClick={() => setQuickActionPanelSubject(subjectOptions[0] ?? '')}
          >
            Take Action <ModActionIcon className="h-4 w-4 align-text-bottom" />
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
