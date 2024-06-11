import { ModEventListQueryOptions, useModEventList } from './useModEventList'
import { LoadMoreButton } from '@/common/LoadMoreButton'
import { ModEventItem } from './EventItem'
import { Dropdown } from '@/common/Dropdown'
import { ArchiveBoxXMarkIcon, ChevronDownIcon } from '@heroicons/react/20/solid'
import { getSubjectTitle } from './helpers/subject'
import { useState } from 'react'
import { ActionButton } from '@/common/buttons'
import { FunnelIcon as FunnelEmptyIcon } from '@heroicons/react/24/outline'
import { FunnelIcon as FunnelFilledIcon } from '@heroicons/react/24/solid'
import { EventFilterPanel } from './FilterPanel'

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
  props: { subject?: string; createdBy?: string } & ModEventListQueryOptions,
) => {
  const {
    types,
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
    toggleCommentFilter,
    setCommentFilterKeyword,
    createdBy,
    subject,
    oldestFirst,
    createdAfter,
    createdBefore,
    applyFilterMacro,
    changeListFilter,
    resetListFilters,
  } = useModEventList(props)

  const [showFiltersPanel, setShowFiltersPanel] = useState(false)
  const isEntireHistoryView = !props.subject && !props.createdBy
  const subjectTitle = getSubjectTitle(modEvents?.[0]?.subject)
  const noEvents = modEvents.length === 0 && !isInitialLoadingModEvents
  const isShowingEventsByCreator = !!props.createdBy
  return (
    <div className="mr-1">
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
        <ActionButton
          size="xs"
          appearance="outlined"
          onClick={() => setShowFiltersPanel((current) => !current)}
        >
          {hasFilter ? (
            <FunnelFilledIcon className="h-3 w-3 mr-1" />
          ) : (
            <FunnelEmptyIcon className="h-3 w-3 mr-1" />
          )}
          <span className="text-xs">Configure</span>
        </ActionButton>
      </div>
      {showFiltersPanel && (
        <EventFilterPanel
          {...{
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
                showContentAuthor={isEntireHistoryView}
                showContentDetails={
                  includeAllUserRecords || isEntireHistoryView
                }
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
