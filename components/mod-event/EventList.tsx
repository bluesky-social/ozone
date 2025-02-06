import {
  ModEventListQueryOptions,
  useModEventList,
  WorkspaceConfirmationOptions,
} from './useModEventList'
import { LoadMoreButton } from '@/common/LoadMoreButton'
import { ModEventItem } from './EventItem'
import { Dropdown, DropdownItem } from '@/common/Dropdown'
import { ArchiveBoxXMarkIcon, ChevronDownIcon } from '@heroicons/react/20/solid'
import { getSubjectTitle } from './helpers/subject'
import { useState } from 'react'
import { ActionButton } from '@/common/buttons'
import {
  FunnelIcon as FunnelEmptyIcon,
  EyeSlashIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'
import {
  Cog8ToothIcon,
  FunnelIcon as FunnelFilledIcon,
} from '@heroicons/react/24/solid'
import { EventFilterPanel } from './FilterPanel'
import { ConfirmationModal } from '@/common/modals/confirmation'
import { ToolsOzoneModerationDefs } from '@atproto/api'
import { SubjectSummary } from '@/subject/Summary'
import { MOD_EVENTS } from './constants'

const getConfirmWorkspaceTitle = (
  showWorkspaceConfirmation: WorkspaceConfirmationOptions,
) => {
  switch (showWorkspaceConfirmation) {
    case 'creators':
      return 'Add creators to workspace'
    case 'subjects':
      return 'Add subjects to workspace'
    case 'subject-authors':
      return 'Add subject authors to workspace'
    default:
      return ''
  }
}

const WorkspaceConfirmationDescription = ({
  showWorkspaceConfirmation,
}: {
  showWorkspaceConfirmation: WorkspaceConfirmationOptions
}) => {
  if (showWorkspaceConfirmation === 'creators') {
    return (
      <p>
        The creators of all the events you can see below will be added to
        workspace. <br />A use-case for this may be when needing to bulk review
        all reports of a certain subject.
      </p>
    )
  }

  if (showWorkspaceConfirmation === 'subjects') {
    return (
      <p>
        Subjects (accounts, posts, lists, starterpacks etc.) of all the events
        you can see below will be added to workspace. <br />A use-case for this
        may be when needing to bulk review all subjects reported with a certain
        keyword or all subjects that were labelled with a certain label in the
        last 24hrs.
      </p>
    )
  }

  if (showWorkspaceConfirmation === 'subject-authors') {
    return (
      <p>
        Authors of the subjects (posts, lists, starterpacks etc.) of all the
        events you can see below will be added to workspace. <br />A use-case
        for this may be when needing to bulk review <b>only</b> the authors of
        posts/lists/starterpacks etc. reported with a certain keyword in the
        last 24hrs.
      </p>
    )
  }

  return null
}

const Header = ({
  subjectTitle,
  includeAllUserRecords,
  setIncludeAllUserRecords,
  isShowingEventsByCreator,
}: {
  subjectTitle: string
  includeAllUserRecords: boolean
  setIncludeAllUserRecords: (param: boolean) => void
  isShowingEventsByCreator: boolean
}) => {
  let content: JSX.Element | null = null
  if (isShowingEventsByCreator) {
    content = <span>Actions by moderator</span>
  } else {
    content = (
      <div>
        Moderation history of{' '}
        <Dropdown
          containerClassName="inline-block"
          className="inline-flex items-center"
          items={[
            {
              text: subjectTitle,
              onClick: () => setIncludeAllUserRecords(false),
            },
            {
              text: 'Entire account',
              onClick: () => setIncludeAllUserRecords(true),
            },
          ]}
        >
          {includeAllUserRecords ? 'Entire account' : subjectTitle}
          <ChevronDownIcon
            className="text-gray-900 dark:text-gray-200 h-4 w-4"
            aria-hidden="true"
          />
        </Dropdown>
      </div>
    )
  }
  return (
    <h4 className="font-medium text-gray-700 dark:text-gray-100">{content}</h4>
  )
}

export const ModEventList = (
  props: {
    subject?: string
    createdBy?: string
    stats?: {
      accountStats?: ToolsOzoneModerationDefs.AccountStats
      recordsStats?: ToolsOzoneModerationDefs.RecordsStats
    }
  } & ModEventListQueryOptions,
) => {
  const {
    types,
    limit,
    reportTypes,
    addedLabels,
    removedLabels,
    addedTags,
    removedTags,
    includeAllUserRecords,
    modEvents,
    fetchMoreModEvents,
    hasMoreModEvents,
    isInitialLoadingModEvents,
    hasFilter,
    commentFilter,
    policies,
    subjectType,
    selectedCollections,
    toggleCommentFilter,
    setCommentFilterKeyword,
    createdBy,
    subject,
    oldestFirst,
    createdAfter,
    createdBefore,
    showContentPreview,
    applyFilterMacro,
    changeListFilter,
    resetListFilters,
    toggleContentPreview,
    showWorkspaceConfirmation,
    setShowWorkspaceConfirmation,
    addToWorkspace,
    isAddingToWorkspace,
  } = useModEventList(props)

  const [showFiltersPanel, setShowFiltersPanel] = useState(false)
  const isEntireHistoryView = !props.subject && !props.createdBy
  const subjectTitle = getSubjectTitle(modEvents?.[0]?.subject)
  const noEvents = modEvents.length === 0 && !isInitialLoadingModEvents
  const isShowingEventsByCreator = !!props.createdBy
  const isMultiSubjectView =
    includeAllUserRecords || isEntireHistoryView || isShowingEventsByCreator
  const eventActions: DropdownItem[] = [
    {
      text: (
        <span className="flex flex-row items-center">
          {!hasFilter ? (
            <FunnelEmptyIcon className="h-3 w-3 mr-1" />
          ) : (
            <FunnelFilledIcon className="h-3 w-3 mr-1" />
          )}{' '}
          {showFiltersPanel ? 'Hide Config' : 'Show Config'}
        </span>
      ),
      onClick: () => setShowFiltersPanel((current) => !current),
    },
  ]

  if (hasFilter) {
    eventActions.push({
      text: 'Clear filters',
      onClick: () => resetListFilters(),
    })
  }

  if (!noEvents) {
    eventActions.push(
      {
        text: 'Add creators to workspace',
        onClick: () => setShowWorkspaceConfirmation('creators'),
      },
      {
        text: 'Add subjects to workspace',
        onClick: () => setShowWorkspaceConfirmation('subjects'),
      },
      {
        text: 'Add subject authors to workspace',
        onClick: () => setShowWorkspaceConfirmation('subject-authors'),
      },
    )
  }

  return (
    <div className="mr-1">
      {!!props.stats && (
        <SubjectSummary
          onAccountTakedownClick={() => {
            changeListFilter({ field: 'types', value: [MOD_EVENTS.TAKEDOWN] })
          }}
          stats={props.stats}
        />
      )}
      <div className="flex flex-row justify-between items-center">
        {!isEntireHistoryView ? (
          <Header
            {...{
              subjectTitle,
              includeAllUserRecords,
              setIncludeAllUserRecords: (value) =>
                changeListFilter({
                  field: 'includeAllUserRecords',
                  value,
                }),
              isShowingEventsByCreator,
            }}
          />
        ) : (
          <h4 className="font-medium text-gray-700 dark:text-gray-100">
            Moderation event stream
          </h4>
        )}
        <div className="flex flex-row">
          {isMultiSubjectView && (
            <ActionButton
              size="xs"
              className="mr-2"
              appearance="outlined"
              title="Show record content preview for each event"
              onClick={() => toggleContentPreview()}
            >
              {showContentPreview ? (
                <EyeSlashIcon className="h-3 w-3 mx-1" />
              ) : (
                <EyeIcon className="h-3 w-3 mx-1" />
              )}
            </ActionButton>
          )}

          <ConfirmationModal
            onConfirm={() => {
              if (!isAddingToWorkspace) {
                addToWorkspace().then(() => setShowWorkspaceConfirmation(null))
              } else {
                setShowWorkspaceConfirmation(null)
              }
            }}
            isOpen={!!showWorkspaceConfirmation}
            setIsOpen={() => setShowWorkspaceConfirmation(null)}
            confirmButtonText={
              isAddingToWorkspace ? 'Stop adding' : 'Add to workspace'
            }
            title={getConfirmWorkspaceTitle(showWorkspaceConfirmation)}
            description={
              <WorkspaceConfirmationDescription
                showWorkspaceConfirmation={showWorkspaceConfirmation}
              />
            }
          />
          <Dropdown
            className="inline-flex flex-row justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 px-4 py-1 text-gray-700 dark:text-gray-100 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 items-center"
            items={eventActions}
            rightAligned
          >
            <Cog8ToothIcon
              className="-ml-1 mr-2 h-4 w-4 text-gray-400"
              aria-hidden="true"
            />
            <span className="text-xs">Options</span>
          </Dropdown>
        </div>
      </div>
      {showFiltersPanel && (
        <EventFilterPanel
          {...{
            limit,
            types,
            reportTypes,
            addedLabels,
            removedLabels,
            commentFilter,
            toggleCommentFilter,
            setCommentFilterKeyword,
            createdBy,
            subject,
            oldestFirst,
            createdAfter,
            createdBefore,
            addedTags,
            removedTags,
            applyFilterMacro,
            changeListFilter,
            policies,
            subjectType,
            selectedCollections,
          }}
        />
      )}
      <div>
        {noEvents ? (
          <div className="text-gray-500 text-center py-4 shadow rounded my-4 items-center justify-center flex flex-col">
            <ArchiveBoxXMarkIcon className="w-6 h-8" />
            No moderation events found.
            {!!types.length && (
              <p className="text-xs italic pt-2">
                <a
                  className="underline"
                  href="#"
                  onClick={() => resetListFilters()}
                >
                  Clear all filters
                </a>{' '}
                to see all events
              </p>
            )}
          </div>
        ) : (
          modEvents.map((modEvent) => {
            return (
              <ModEventItem
                key={modEvent.id}
                modEvent={modEvent}
                showContentAuthor={
                  // isEntireHistoryView means user is viewing the events page so
                  // we need to provide context for each event and link to content details
                  // Same when we are showing events by a certain author to since the author
                  // may be reporting different subjects
                  isEntireHistoryView || isShowingEventsByCreator
                }
                // When the event history is being displayed for a single record/subject
                // there's no point showing the preview in each event
                showContentPreview={showContentPreview && isMultiSubjectView}
                showContentDetails={isMultiSubjectView}
              />
            )
          })
        )}
      </div>
      {hasMoreModEvents && (
        <div className="pt-2">
          <LoadMoreButton onClick={() => fetchMoreModEvents()} />
        </div>
      )}
    </div>
  )
}
