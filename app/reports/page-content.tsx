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
  AtUri,
  ToolsOzoneModerationDefs,
  ToolsOzoneModerationEmitEvent,
  ToolsOzoneModerationQueryStatuses,
} from '@atproto/api'
import { SectionHeader } from '../../components/SectionHeader'
import { ModActionIcon } from '@/common/ModActionIcon'
import { validSubjectString } from '@/lib/types'
import { ModActionPanelQuick } from '../actions/ModActionPanel/QuickAction'
import { ButtonGroup } from '@/common/buttons'
import { SubjectTable } from 'components/subject/table'
import { useTitle } from 'react-use'
import { LanguagePicker } from '@/common/LanguagePicker'
import { QueueSelector, QUEUE_NAMES } from '@/reports/QueueSelector'
import { unique } from '@/lib/util'
import { useEmitEvent } from '@/mod-event/helpers/emitEvent'
import { useFluentReportSearchParams } from '@/reports/useFluentReportSearch'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { WorkspacePanel } from 'components/workspace/Panel'
import { useWorkspaceOpener } from '@/common/useWorkspaceOpener'

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
          id: 'onlyMuted',
          text: 'Only Muted',
          onClick: () => updateParams('onlyMuted', true),
          isActive: onlyMuted === 'true',
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
              updateParams('appealed', false)
            } else if (appealed === 'false') {
              // setting the same value toggles the param off
              updateParams('appealed', false)
            } else {
              updateParams('appealed', true)
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

  if (!['lastReportedAt', 'lastReviewedAt'].includes(sortField ?? '')) {
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
        <LanguagePicker />
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

  const takendown = !!params.get('takendown')
  const includeMuted = !!params.get('includeMuted')
  const onlyMuted = !!params.get('onlyMuted')
  const appealed = params.get('appealed')
  const reviewState = params.get('reviewState')
  const tags = params.get('tags')
  const excludeTags = params.get('excludeTags')
  const queueName = params.get('queueName')
  const { sortField, sortDirection } = getSortParams(params)
  const { lastReviewedBy, subject, reporters } = useFluentReportSearchParams()

  return useInfiniteQuery({
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
        tags,
        excludeTags,
        queueName,
        includeMuted,
        onlyMuted,
      },
    ],
    queryFn: async ({ pageParam }) => {
      const queryParams: ToolsOzoneModerationQueryStatuses.QueryParams = {
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

      const { data } =
        await labelerAgent.api.tools.ozone.moderation.queryStatuses({
          limit: 50,
          includeMuted: true,
          ...queryParams,
        })

      const queueDivider = QUEUE_NAMES.length
      const queueIndex = QUEUE_NAMES.indexOf(queueName ?? '')
      const statusesInQueue = queueName
        ? data.subjectStatuses.filter((status) => {
            const subjectDid =
              status.subject.$type === 'com.atproto.admin.defs#repoRef'
                ? status.subject.did
                : new AtUri(`${status.subject.uri}`).host
            const queueDeciderCharCode =
              `${subjectDid}`.split(':').pop()?.charCodeAt(0) || 0
            return queueDeciderCharCode % queueDivider === queueIndex
          })
        : data.subjectStatuses

      return { cursor: data.cursor, subjectStatuses: statusesInQueue }
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  })
}
