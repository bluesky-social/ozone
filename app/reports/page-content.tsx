'use client'
import { useCallback } from 'react'
import {
  ReadonlyURLSearchParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation'
import { useInfiniteQuery } from '@tanstack/react-query'
import {
  ToolsOzoneModerationDefs,
  ToolsOzoneModerationEmitEvent,
  ToolsOzoneReportQueryReports,
} from '@atproto/api'
import { SectionHeader } from '../../components/SectionHeader'
import { ModActionIcon } from '@/common/ModActionIcon'
import { ModActionPanelQuick } from '../actions/ModActionPanel/QuickAction'
import { ButtonGroup } from '@/common/buttons'
import { ReportTable } from 'components/reports/table'
import { useTitle } from 'react-use'
import { QueueSelector } from '@/reports/QueueSelector'
import { unique } from '@/lib/util'
import {
  ActionPanelNames,
  hydrateModToolInfo,
  useEmitEvent,
} from '@/mod-event/helpers/emitEvent'
import { useFluentReportSearchParams } from '@/reports/useFluentReportSearch'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { WorkspacePanel } from 'components/workspace/Panel'
import { useWorkspaceOpener } from '@/common/useWorkspaceOpener'
import { useQueueSetting } from 'components/setting/useQueueSetting'
import QueueFilterPanel from '@/reports/QueueFilter/Panel'
import { ReportStatuses } from '@/reports/constants'

const TABS = [
  {
    key: 'unresolved',
    name: 'Unresolved',
    href: `/reports?reviewState=${encodeURIComponent(ReportStatuses.OPEN)}`,
  },
  {
    key: 'escalated',
    name: 'Escalated',
    href: `/reports?reviewState=${encodeURIComponent(ReportStatuses.ESCALATED)}`,
  },
  {
    key: 'closed',
    name: 'Closed',
    href: `/reports?reviewState=${encodeURIComponent(ReportStatuses.CLOSED)}`,
  },
  {
    key: 'assigned',
    name: 'Assigned',
    href: `/reports?reviewState=${encodeURIComponent(ReportStatuses.ASSIGNED)}`,
  },
  { key: 'all', name: 'All', href: '/reports' },
]

const buildPageTitle = ({ currentTab }: { currentTab: string }) => {
  const titleFromTab =
    currentTab === 'all'
      ? `All subjects`
      : `${currentTab[0].toUpperCase()}${currentTab.slice(1)}`
  const additionalFragments: string[] = []

  const additionalTitle = additionalFragments.length
    ? ` (${additionalFragments.join(', ')})`
    : ''
  const title = `Queue - ${titleFromTab}${additionalTitle}`
  return title
}

const ResolvedFilters = () => {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const takendown = params.get('takendown')
  const includeMuted = params.get('includeMuted')
  const onlyMuted = params.get('onlyMuted')
  const appealed = params.get('appealed')

  const updateParams = useCallback(
    (updates: Record<string, boolean>) => {
      const nextParams = new URLSearchParams(params)
      Object.entries(updates).forEach(([key, newState]) => {
        if (nextParams.get(key) === `${newState}`) {
          nextParams.delete(key)
        } else {
          nextParams.set(key, `${newState}`)
        }
      })
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
          onClick: () => updateParams({ takendown: true }),
          isActive: takendown === 'true',
        },
        {
          id: 'mute',
          text:
            includeMuted === 'true'
              ? 'Include Muted'
              : onlyMuted === 'true'
                ? 'Only Muted'
                : 'Mutes',
          onClick: () => {
            // setting a param to it's current value toggles it off
            // so we toggle off includeMuted and toggle on onlyMuted
            if (includeMuted === 'true') {
              updateParams({ includeMuted: true, onlyMuted: true })
            } else if (onlyMuted === 'true') {
              updateParams({ onlyMuted: true })
            } else {
              updateParams({ includeMuted: true })
            }
          },
          isActive: includeMuted === 'true' || onlyMuted === 'true',
        },
        {
          id: 'appealed',
          text:
            appealed === 'true'
              ? 'Only Appeals'
              : appealed === 'false'
                ? 'No Appeals'
                : 'Appeals',
          onClick: () => {
            if (appealed === 'true') {
              updateParams({ appealed: false })
            } else if (appealed === 'false') {
              // setting the same value toggles the param off
              updateParams({ appealed: false })
            } else {
              updateParams({ appealed: true })
            }
          },
          isActive: appealed === 'true' || appealed === 'false',
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

  if (!['createdAt', 'updatedAt'].includes(sortField ?? '')) {
    sortField = 'createdAt'
  }

  return { sortField, sortDirection }
}

export const ReportsPageContent = () => {
  const emitEvent = useEmitEvent()
  const params = useSearchParams()
  const quickOpenParam = params.get('quickOpen') ?? ''
  const reviewState = params.get('reviewState')
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
  const { toggleWorkspacePanel, isWorkspaceOpen } = useWorkspaceOpener()

  const { data, fetchNextPage, hasNextPage, refetch, isInitialLoading } =
    useModerationQueueQuery()

  const reports = data?.pages.flatMap((page) => page.reports) ?? []
  const currentTab = getTabFromParams({ reviewState })
  const subjectOptions = unique(reports.map((report) => report.subject.subject))

  const pageTitle = buildPageTitle({
    currentTab,
  })
  useTitle(pageTitle)

  return (
    <>
      <SectionHeader title={<QueueSelector />} tabs={TABS} current={currentTab}>
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
      <div className="md:flex mt-2 mb-2 flex-row justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex flex-row items-center gap-2">
          <QueueFilterPanel />
        </div>
        <ResolvedFilters />
      </div>
      <ReportTable
        reports={reports}
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
        onSubmit={async (vals: ToolsOzoneModerationEmitEvent.InputSchema) => {
          await emitEvent(
            hydrateModToolInfo(vals, ActionPanelNames.QuickAction),
          )
          refetch()
        }}
      />
      <WorkspacePanel
        open={isWorkspaceOpen}
        onClose={() => toggleWorkspacePanel()}
      />
    </>
  )
}

function getTabFromParams({ reviewState }: { reviewState?: string | null }) {
  const reviewStateMap = {
    [ToolsOzoneModerationDefs.REVIEWESCALATED]: 'escalated',
    [ToolsOzoneModerationDefs.REVIEWCLOSED]: 'resolved',
    [ToolsOzoneModerationDefs.REVIEWOPEN]: 'unresolved',
    [ToolsOzoneModerationDefs.REVIEWNONE]: 'noreview',
  }

  if (reviewState) {
    return reviewStateMap[reviewState] || 'all'
  }

  return 'all'
}

function useModerationQueueQuery() {
  const labelerAgent = useLabelerAgent()
  const params = useSearchParams()
  useQueueSetting()

  const takendown = !!params.get('takendown')
  const appealed = params.get('appealed')
  const tags = params.get('tags')
  const excludeTags = params.get('excludeTags')
  const queueName = params.get('queueName')
  const subjectType = params.get('subjectType')
  const collections = params.get('collections')
  const status = params.get('status')
  const { sortField, sortDirection } = getSortParams(params)
  const { lastReviewedBy, subject, reporters } = useFluentReportSearchParams()

  return useInfiniteQuery({
    queryKey: [
      'events',
      {
        subject,
        sortField,
        sortDirection,
        status,
        lastReviewedBy,
        reporters,
        takendown,
        appealed,
        tags,
        excludeTags,
        queueName,
        subjectType,
        collections,
      },
    ],
    queryFn: async ({ pageParam }) => {
      const queryParams: ToolsOzoneReportQueryReports.QueryParams = {
        cursor: pageParam,
      }

      if (subject) {
        queryParams.subject = subject
      } else {
        if (subjectType) {
          queryParams.subjectType = subjectType
        }

        if (subjectType === 'record') {
          const collectionNames = collections?.split(',')
          if (collectionNames?.length) {
            queryParams.collections = collectionNames
          }
        }
      }

      // if (appealed === 'true') {
      //   queryParams.appealed = true
      // } else if (appealed === 'false') {
      //   queryParams.appealed = false
      // }

      // @TODO: We probably need tag based filtering
      // if (tags) {
      //   queryParams.tags = tags.split(',')
      // }

      // if (excludeTags) {
      //   queryParams.excludeTags = excludeTags.split(',')
      // }

      // For these fields, we only want to add them to the filter if the values are set, otherwise, defaults will kick in
      Object.entries({
        sortField,
        sortDirection,
        status,
        reviewedBy: lastReviewedBy,
      }).forEach(([key, value]) => {
        if (value) {
          queryParams[key] = value
        }
      })

      const pageSize = 100

      const { data } = await labelerAgent.tools.ozone.report.queryReports({
        limit: pageSize,
        ...queryParams,
      })

      return data
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })
}
