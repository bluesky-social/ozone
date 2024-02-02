import {
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
            className="text-gray-900 h-4 w-4"
            aria-hidden="true"
          />
        </Dropdown>
      </div>
    )
  }
  return <h4 className="font-medium text-gray-700">{content}</h4>
}

export const ModEventList = (
  props: { subject?: string; createdBy?: string } & ModEventListQueryOptions,
) => {
  const {
    types,
    setTypes,
    includeAllUserRecords,
    setIncludeAllUserRecords,
    modEvents,
    fetchMoreModEvents,
    hasMoreModEvents,
    isInitialLoadingModEvents,
    hasFilter,
    commentFilter,
    toggleCommentFilter,
    setCommentFilterKeyword,
    createdBy,
    setCreatedBy,
    subject,
    setSubject,
    oldestFirst,
    setOldestFirst,
    createdAfter,
    setCreatedAfter,
    createdBefore,
    setCreatedBefore,
  } = useModEventList(props)

  const [showFiltersPanel, setShowFiltersPanel] = useState(false)
  const isEntireHistoryView = !props.subject && !props.createdBy
  const subjectTitle = getSubjectTitle(modEvents?.[0]?.subject)
  const noEvents = modEvents.length === 0 && !isInitialLoadingModEvents
  const isShowingEventsByCreator = !!props.createdBy
  return (
    <div>
      <div className="flex flex-row justify-between items-center">
        {!isEntireHistoryView ? (
          <Header
            {...{
              subjectTitle,
              includeAllUserRecords,
              setIncludeAllUserRecords,
              isShowingEventsByCreator,
            }}
          />
        ) : (
          <h4 className="font-medium text-gray-700">Moderation event stream</h4>
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
        <div className="shadow rounded py-3 px-5 bg-white mt-2 mx-1">
          <div className="flex flex-row">
            <div className="mr-4">
              <TypeFilterCheckbox
                selectedTypes={types}
                setSelectedTypes={setTypes}
              />
            </div>
            <div>
              <h5 className="text-gray-700 font-medium">Comment/Note</h5>

              <div className="flex flex-row items-center mr-2 mt-2">
                <input
                  id={`comment-filter`}
                  name={`comment-filter`}
                  type="checkbox"
                  value={`true`}
                  checked={commentFilter.enabled}
                  onChange={() => toggleCommentFilter()}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault() // make sure we don't submit the form
                      e.currentTarget.click() // simulate a click on the input
                    }
                  }}
                />
                <label
                  htmlFor={`comment-filter`}
                  className="ml-1 text-sm leading-6 text-gray-700"
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
                  disabled={!!props.createdBy}
                  value={createdBy || ''}
                  onChange={(ev) => setCreatedBy(ev.target.value)}
                  autoComplete="off"
                />
              </FormLabel>

              <FormLabel
                label="Subject"
                htmlFor="subject"
                className="flex-1 mt-2"
              >
                <Input
                  type="text"
                  id="subject"
                  name="subject"
                  disabled={!!props.subject}
                  placeholder="DID or AT-URI"
                  className="block w-full"
                  value={subject || ''}
                  onChange={(ev) => setSubject(ev.target.value)}
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
                  onChange={(ev) => setCreatedAfter(ev.target.value)}
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
                  onChange={(ev) => setCreatedBefore(ev.target.value)}
                  autoComplete="off"
                  min={FIRST_EVENT_TIMESTAMP}
                  max={new Date().toISOString().split('.')[0]}
                />
              </FormLabel>
            </div>
          </div>
          <div>
            <h5 className="text-gray-700 font-medium my-2">Sort Direction</h5>

            <Checkbox
              id="sortDirection"
              name="sortDirection"
              className="flex items-center"
              checked={oldestFirst}
              onChange={() => setOldestFirst((current) => !current)}
              label="Show oldest events first (default: newest first)"
            />
          </div>
        </div>
      )}
      <div>
        {noEvents ? (
          <div className="text-gray-500 text-center py-4 shadow rounded my-4 items-center justify-center flex flex-col">
            <ArchiveBoxXMarkIcon className="w-6 h-8" />
            No moderation events found.
            {!!types.length && (
              <p className="text-xs italic pt-2">
                <a className="underline" href="#" onClick={() => setTypes([])}>
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

// This is component which renders a list of checkboxes by iterating over MOD_EVENT_TITLES list for filtering by type
// same as the TypeFilter component but instead of dropdown, use checkboxes
// on each checkbox click, it will call the `setSelectedTypes` function and toggle the checkox's type
const TypeFilterCheckbox = ({
  selectedTypes,
  setSelectedTypes,
}: {
  selectedTypes: string[]
  setSelectedTypes: (type: string[]) => void
}) => {
  const allTypes = Object.entries(MOD_EVENT_TITLES)
  const toggleType = (type) => {
    if (type === 'all') {
      if (selectedTypes.length === allTypes.length) {
        setSelectedTypes([])
      } else {
        setSelectedTypes(allTypes.map(([type]) => type))
      }
      return
    }
    const newTypes = selectedTypes.includes(type)
      ? selectedTypes.filter((t) => t !== type)
      : [...selectedTypes, type]
    setSelectedTypes(newTypes)
  }

  return (
    <div>
      <h5 className="text-gray-700 font-medium">Event Type</h5>
      <div className="flex flex-row items-center mr-2 mt-2">
        <input
          id={`type-all`}
          name={`type-all`}
          type="checkbox"
          value={'all'}
          checked={selectedTypes.length === allTypes.length}
          onChange={() => toggleType('all')}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault() // make sure we don't submit the form
              e.currentTarget.click() // simulate a click on the input
            }
          }}
        />
        <label
          htmlFor={`type-all`}
          className="ml-1 text-sm leading-6 text-gray-700"
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
            checked={selectedTypes.includes(type)}
            onChange={() => toggleType(type)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault() // make sure we don't submit the form
                e.currentTarget.click() // simulate a click on the input
              }
            }}
          />
          <label
            htmlFor={`type-${type}`}
            className="ml-1 text-sm leading-6 text-gray-700"
          >
            {title}
          </label>
        </div>
      ))}
    </div>
  )
}
