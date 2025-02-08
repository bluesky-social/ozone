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
  Agent,
  AtUri,
  ToolsOzoneModerationDefs,
  ToolsOzoneModerationEmitEvent,
  ToolsOzoneModerationQueryStatuses,
  ComAtprotoAdminDefs,
} from '@atproto/api'
import { SectionHeader } from '../../components/SectionHeader'
import { ModActionIcon } from '@/common/ModActionIcon'
import { validSubjectString } from '@/lib/types'
import { ModActionPanelQuick } from '../actions/ModActionPanel/QuickAction'
import { ButtonGroup } from '@/common/buttons'
import { SubjectTable } from 'components/subject/table'
import { useTitle } from 'react-use'
import { QueueSelector } from '@/reports/QueueSelector'
import { simpleHash, unique } from '@/lib/util'
import { useEmitEvent } from '@/mod-event/helpers/emitEvent'
import { useFluentReportSearchParams } from '@/reports/useFluentReportSearch'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { WorkspacePanel } from 'components/workspace/Panel'
import { useWorkspaceOpener } from '@/common/useWorkspaceOpener'
import { useQueueSetting } from 'components/setting/useQueueSetting'
import QueueFilterPanel from '@/reports/QueueFilter/Panel'

const TABS = [
  {
    key: 'unresolved',
    name: 'Unresolved',
    href: `/reports?reviewState=${encodeURIComponent(
      ToolsOzoneModerationDefs.REVIEWOPEN,
    )}`,
  },
  {
    key: 'escalated',
    name: 'Escalated',
    href: `/reports?reviewState=${encodeURIComponent(
      ToolsOzoneModerationDefs.REVIEWESCALATED,
    )}`,
  },
  {
    key: 'resolved',
    name: 'Resolved',
    href: `/reports?reviewState=${encodeURIComponent(
      ToolsOzoneModerationDefs.REVIEWCLOSED,
    )}`,
  },
  { key: 'all', name: 'All', href: '/reports' },
]

const buildPageTitle = ({
  currentTab,
  takendown,
  includeMuted,
  appealed,
}: {
  currentTab: string
  takendown: boolean
  includeMuted: boolean
  appealed: string | null
}) => {
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

  if (appealed === 'true') {
    additionalFragments.push('Only Appeals')
  } else if (appealed === 'false') {
    additionalFragments.push('No Appeals')
  }

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

  if (
    ![
      'lastReportedAt',
      'lastReviewedAt',
      'reportedRecordsCount',
      'takendownRecordsCount',
      'priorityScore',
    ].includes(sortField ?? '')
  ) {
    sortField = 'lastReportedAt'
  }

  return { sortField, sortDirection }
}

export const ReportsPageContent = () => {
  const emitEvent = useEmitEvent()
  const params = useSearchParams()
  const quickOpenParam = params.get('quickOpen') ?? ''
  const takendown = !!params.get('takendown')
  const includeMuted = !!params.get('includeMuted')
  const appealed = params.get('appealed')
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

  const subjectStatuses =
    data?.pages.flatMap((page) => page.subjectStatuses) ?? []
  const currentTab = getTabFromParams({ reviewState })
  const subjectOptions = unique(
    subjectStatuses.flatMap(
      (report) => validSubjectString(report.subject) ?? [],
    ),
  )

  const pageTitle = buildPageTitle({
    currentTab,
    takendown,
    includeMuted,
    appealed,
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
        onSubmit={async (vals: ToolsOzoneModerationEmitEvent.InputSchema) => {
          await emitEvent(vals)
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
  }

  if (reviewState) {
    return reviewStateMap[reviewState] || 'all'
  }

  return 'all'
}

function useModerationQueueQuery() {
  const labelerAgent = useLabelerAgent()
  const params = useSearchParams()
  const { setting: queueSetting } = useQueueSetting()

  const takendown = !!params.get('takendown')
  const includeMuted = !!params.get('includeMuted')
  const onlyMuted = !!params.get('onlyMuted')
  const appealed = params.get('appealed')
  const reviewState = params.get('reviewState')
  const tags = params.get('tags')
  const excludeTags = params.get('excludeTags')
  const queueName = params.get('queueName')
  const subjectType = params.get('subjectType')
  const collections = params.get('collections')
  const minAccountSuspendCount = params.get('minAccountSuspendCount')
  const minReportedRecordsCount = params.get('minReportedRecordsCount')
  const minTakendownRecordsCount = params.get('minTakendownRecordsCount')
  const minPriorityScore = params.get('minPriorityScore')
  const { sortField, sortDirection } = getSortParams(params)
  const { lastReviewedBy, subject, reporters, includeAllUserRecords } =
    useFluentReportSearchParams()

  return useInfiniteQuery({
    queryKey: [
      'events',
      {
        includeAllUserRecords,
        subject,
        sortField,
        sortDirection,
        reviewState,
        lastReviewedBy,
        reporters,
        takendown,
        appealed,
        tags,
        excludeTags,
        queueName,
        includeMuted,
        onlyMuted,
        subjectType,
        collections,
        minAccountSuspendCount,
        minReportedRecordsCount,
        minTakendownRecordsCount,
        minPriorityScore,
      },
    ],
    queryFn: async ({ pageParam }) => {
      const queryParams: ToolsOzoneModerationQueryStatuses.QueryParams = {
        cursor: pageParam,
      }

      if (includeAllUserRecords) {
        queryParams.includeAllUserRecords = includeAllUserRecords
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

      if (takendown) {
        queryParams.takendown = takendown
      }

      if (includeMuted) {
        queryParams.includeMuted = includeMuted
      }

      if (onlyMuted) {
        queryParams.onlyMuted = onlyMuted
      }

      if (appealed === 'true') {
        queryParams.appealed = true
      } else if (appealed === 'false') {
        queryParams.appealed = false
      }

      if (tags) {
        queryParams.tags = tags.split(',')
      }

      if (excludeTags) {
        queryParams.excludeTags = excludeTags.split(',')
      }

      if (minAccountSuspendCount) {
        queryParams.minAccountSuspendCount = Number(minAccountSuspendCount)
      }

      if (minReportedRecordsCount) {
        queryParams.minReportedRecordsCount = Number(minReportedRecordsCount)
      }

      if (minTakendownRecordsCount) {
        queryParams.minTakendownRecordsCount = Number(minTakendownRecordsCount)
      }

      if (minPriorityScore) {
        queryParams.minPriorityScore = Number(minPriorityScore)
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

      return getQueueItems(
        labelerAgent,
        queryParams,
        queueName,
        queueSetting.data
          ? {
              queueNames: queueSetting.data.queueNames,
              queueSeed: queueSetting.data.queueSeed.setting,
            }
          : undefined,
      )
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })
}

const getQueueItems = async (
  labelerAgent: Agent,
  queryParams: ToolsOzoneModerationQueryStatuses.QueryParams,
  queueName: string | null,
  queueSetting?: { queueNames: string[]; queueSeed: string },
) => {
  const pageSize = 100

  if (queueName && queueSetting?.queueNames.length) {
    const queueIndex = queueSetting.queueNames.indexOf(queueName)
    // Only apply queue filters if the user is looking at a queue that exists in the list of queues
    if (queueIndex >= 0) {
      queryParams.queueIndex = queueIndex
      queryParams.queueCount = queueSetting.queueNames.length
      if (queueSetting.queueSeed) {
        queryParams.queueSeed = queueSetting.queueSeed
      }
    }
  }
  const { data } = await labelerAgent.tools.ozone.moderation.queryStatuses({
    limit: pageSize,
    includeMuted: true,
    ...queryParams,
  })

  return data
}
