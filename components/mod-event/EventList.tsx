import { useModEventList } from './useModEventList'
import { LoadMoreButton } from '@/common/LoadMoreButton'
import { ModEventItem } from './EventItem'
import { Dropdown } from '@/common/Dropdown'
import { MOD_EVENT_TITLES } from './constants'
import {
  ArchiveBoxXMarkIcon,
  CheckIcon,
  ChevronDownIcon,
} from '@heroicons/react/20/solid'
import { getSubjectTitle } from './helpers/subject'

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
  props: { subject: string } | { createdBy: string },
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
  } = useModEventList(props)
  const subjectTitle = getSubjectTitle(modEvents?.[0]?.subject)
  const noEvents = modEvents.length === 0 && !isInitialLoadingModEvents
  const isShowingEventsByCreator = 'createdBy' in props
  return (
    <div>
      <div className="flex flex-row justify-between items-center">
        <Header
          {...{
            subjectTitle,
            includeAllUserRecords,
            setIncludeAllUserRecords,
            isShowingEventsByCreator,
          }}
        />
        <TypeFilter setSelectedTypes={setTypes} selectedTypes={types} />
      </div>
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
                showContentDetails={includeAllUserRecords}
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

const TypeFilter = ({
  selectedTypes,
  setSelectedTypes,
}: {
  selectedTypes: string[]
  setSelectedTypes: (type: string[]) => void
}) => {
  const toggleType = (type) => {
    const newTypes = selectedTypes.includes(type)
      ? selectedTypes.filter((t) => t !== type)
      : [...selectedTypes, type]
    setSelectedTypes(newTypes)
  }

  let selectedText = 'Filter by type'

  if (selectedTypes.length === 1) {
    selectedText = MOD_EVENT_TITLES[selectedTypes[0]]
  } else if (selectedTypes.length > 1) {
    selectedText = `${selectedTypes.length} selected`
  }

  return (
    <Dropdown
      className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
      items={[
        {
          id: 'all',
          text: (
            <span className="flex flex-row items-center">
              {!selectedTypes.length && (
                <CheckIcon
                  className="mr-1 h-5 w-5 text-violet-200 hover:text-violet-100"
                  aria-hidden="true"
                />
              )}
              All
            </span>
          ),
          onClick: () => setSelectedTypes([]),
        },
        ...Object.entries(MOD_EVENT_TITLES).map(([type, title]) => ({
          id: title,
          text: (
            <span className="flex flex-row items-center">
              {(selectedTypes.includes(type) || !selectedTypes.length) && (
                <CheckIcon
                  className="mr-1 h-5 w-5 text-violet-200 hover:text-violet-100"
                  aria-hidden="true"
                />
              )}
              {title}
            </span>
          ),
          onClick: () => toggleType(type),
        })),
      ]}
      rightAligned
    >
      {selectedText}
      <ChevronDownIcon
        className="ml-2 -mr-1 h-5 w-5 text-violet-200 hover:text-violet-100"
        aria-hidden="true"
      />
    </Dropdown>
  )
}
