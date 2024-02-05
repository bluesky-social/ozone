import {
  EventListState,
  FIRST_EVENT_TIMESTAMP,
  ModEventListQueryOptions,
  useModEventList,
} from './useModEventList'
import { LoadMoreButton } from '@/common/LoadMoreButton'
import { ModEventItem } from './EventItem'
import { Dropdown } from '@/common/Dropdown'
import { MOD_EVENT_TITLES } from './constants'
import { ArchiveBoxXMarkIcon, ChevronDownIcon } from '@heroicons/react/20/solid'
import { getSubjectTitle } from './helpers/subject'
import { useState } from 'react'
import { Checkbox, FormLabel, Input } from '@/common/forms'
import { ActionButton } from '@/common/buttons'
import { FunnelIcon as FunnelEmptyIcon } from '@heroicons/react/24/outline'
import { FunnelIcon as FunnelFilledIcon } from '@heroicons/react/24/solid'

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
            commentFilter,
            toggleCommentFilter,
            setCommentFilterKeyword,
            createdBy,
            subject,
            oldestFirst,
            createdAfter,
            createdBefore,
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

const EventFilterPanel = ({
  types,
  commentFilter,
  createdBy,
  subject,
  oldestFirst,
  createdAfter,
  createdBefore,
  toggleCommentFilter,
  setCommentFilterKeyword,
  changeListFilter,
}: Omit<EventListState, 'includeAllUserRecords'> &
  Pick<
    ReturnType<typeof useModEventList>,
    | 'changeListFilter'
    | 'commentFilter'
    | 'toggleCommentFilter'
    | 'setCommentFilterKeyword'
  >) => {
  const allTypes = Object.entries(MOD_EVENT_TITLES)
  const toggleType = (type) => {
    if (type === 'all') {
      if (types.length === allTypes.length) {
        changeListFilter({ field: 'types', value: [] })
      } else {
        changeListFilter({
          field: 'types',
          value: allTypes.map(([type]) => type),
        })
      }
      return
    }
    const newTypes = types.includes(type)
      ? types.filter((t) => t !== type)
      : [...types, type]
    changeListFilter({ field: 'types', value: newTypes })
  }

  return (
    <div className="shadow dark:shadow-slate-700 rounded py-3 px-5 bg-white dark:bg-slate-800 mt-2">
      <div className="flex flex-row">
        <div className="mr-4">
          <div>
            <h5 className="text-gray-700 dark:text-gray-100 font-medium">
              Event Type
            </h5>
            <div className="flex flex-row items-center mr-2 mt-2">
              <input
                id={`type-all`}
                name={`type-all`}
                type="checkbox"
                value={'all'}
                checked={types.length === allTypes.length}
                onChange={() => toggleType('all')}
                className="h-4 w-4 rounded border-gray-300 dark:border-teal-300 text-indigo-600 dark:text-teal-600 focus:ring-indigo-600 dark:focus:ring-teal-600"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault() // make sure we don't submit the form
                    e.currentTarget.click() // simulate a click on the input
                  }
                }}
              />
              <label
                htmlFor={`type-all`}
                className="ml-1 text-sm leading-6 text-gray-700 dark:text-gray-100"
              >
                All
              </label>
            </div>
            {allTypes.map(([type, title]) => (
              <div className="flex flex-row items-center mr-2" key={type}>
                <input
                  id={`type-${type}`}
                  name={`type-${type}`}
                  type="checkbox"
                  value={type}
                  checked={types.includes(type)}
                  onChange={() => toggleType(type)}
                  className="h-4 w-4 rounded border-gray-300 dark:border-teal-300 text-indigo-600 dark:text-teal-600 focus:ring-indigo-600 dark:focus:ring-teal-600"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault() // make sure we don't submit the form
                      e.currentTarget.click() // simulate a click on the input
                    }
                  }}
                />
                <label
                  htmlFor={`type-${type}`}
                  className="ml-1 text-sm leading-6 text-gray-700 dark:text-gray-100"
                >
                  {title}
                </label>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h5 className="text-gray-700 dark:text-gray-100 font-medium">
            Comment/Note
          </h5>

          <div className="flex flex-row items-center mr-2 mt-2">
            <input
              id={`comment-filter`}
              name={`comment-filter`}
              type="checkbox"
              value={`true`}
              checked={commentFilter.enabled}
              onChange={() => toggleCommentFilter()}
              className="h-4 w-4 rounded border-gray-300 dark:border-teal-300 text-indigo-600 dark:text-teal-600 focus:ring-indigo-600 dark:focus:ring-teal-600"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault() // make sure we don't submit the form
                  e.currentTarget.click() // simulate a click on the input
                }
              }}
            />
            <label
              htmlFor={`comment-filter`}
              className="ml-1 text-sm leading-6 text-gray-700 dark:text-gray-100"
            >
              Events with comments
            </label>
          </div>
          {commentFilter?.enabled && (
            <FormLabel
              label="Comment Keyword"
              htmlFor="keyword"
              className="flex-1 mt-2"
            >
              <Input
                type="text"
                id="keyword"
                name="keyword"
                required
                placeholder="trim, later, soon etc."
                className="block w-full"
                value={commentFilter.keyword}
                onChange={(ev) => setCommentFilterKeyword(ev.target.value)}
                autoComplete="off"
              />
            </FormLabel>
          )}

          <FormLabel
            label="Event Author DID"
            htmlFor="createdBy"
            className="flex-1 mt-2"
          >
            <Input
              type="text"
              id="createdBy"
              name="createdBy"
              placeholder="DID of the author of the event"
              className="block w-full"
              value={createdBy || ''}
              onChange={(ev) =>
                changeListFilter({
                  field: 'createdBy',
                  value: ev.target.value,
                })
              }
              autoComplete="off"
            />
          </FormLabel>

          <FormLabel label="Subject" htmlFor="subject" className="flex-1 mt-2">
            <Input
              type="text"
              id="subject"
              name="subject"
              placeholder="DID or AT-URI"
              className="block w-full"
              value={subject || ''}
              onChange={(ev) =>
                changeListFilter({
                  field: 'subject',
                  value: ev.target.value,
                })
              }
              autoComplete="off"
            />
          </FormLabel>

          <FormLabel
            label="Events Created After"
            htmlFor="createdAfter"
            className="flex-1 mt-2"
          >
            <Input
              type="datetime-local"
              id="createdAfter"
              name="createdAfter"
              className="block w-full"
              value={createdAfter}
              onChange={(ev) =>
                changeListFilter({
                  field: 'createdAfter',
                  value: ev.target.value,
                })
              }
              autoComplete="off"
              min={FIRST_EVENT_TIMESTAMP}
              max={new Date().toISOString().split('.')[0]}
            />
          </FormLabel>

          <FormLabel
            label="Events Created Before"
            htmlFor="createdBefore"
            className="flex-1 mt-2"
          >
            <Input
              type="datetime-local"
              id="createdBefore"
              name="createdBefore"
              className="block w-full"
              value={createdBefore}
              onChange={(ev) =>
                changeListFilter({
                  field: 'createdBefore',
                  value: ev.target.value,
                })
              }
              autoComplete="off"
              min={FIRST_EVENT_TIMESTAMP}
              max={new Date().toISOString().split('.')[0]}
            />
          </FormLabel>
        </div>
      </div>
      <div>
        <h5 className="text-gray-700 dark:text-gray-100 font-medium my-2">
          Sort Direction
        </h5>

        <Checkbox
          id="sortDirection"
          name="sortDirection"
          className="flex items-center"
          checked={oldestFirst}
          onChange={() =>
            changeListFilter({ field: 'oldestFirst', value: !oldestFirst })
          }
          label="Show oldest events first (default: newest first)"
        />
      </div>
    </div>
  )
}
