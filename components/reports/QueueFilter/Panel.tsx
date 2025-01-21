import { Popover, Transition } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import { QueueFilterSubjectType } from './SubjectType'
import { useSearchParams } from 'next/navigation'
import { useQueueFilterBuilder } from '../useQueueFilter'
import { ToolsOzoneModerationQueryStatuses } from '@atproto/api'
import { getLanguageFlag } from 'components/tags/SubjectTag'
import { getCollectionName } from '../helpers/subject'
import { classNames } from '@/lib/util'
import { QueueFilterTags } from './Tag'
import { QueueFilterStats } from './Stats'

const buildTagFilterSummary = (tags: string[]) => {
  const filtered = tags.filter(Boolean)
  if (!filtered.length) {
    return ''
  }

  const list = filtered.map((tag) => {
    return tag
      .split('&&')
      .map((t) => {
        t = t.trim()
        if (t.startsWith('lang:')) {
          const langCode = t.split(':')[1]
          return getLanguageFlag(langCode) || t
        }
        return t
      })
      .join(' AND ')
  })

  if (list.length === 1) {
    return list[0]
  }

  return `(${list.join(') OR (')})`
}

// Takes all the queue filters manageable in the panel and displays a summary of selections made
const FilterSummary = ({
  queueFilters,
}: {
  queueFilters: ToolsOzoneModerationQueryStatuses.QueryParams
}) => {
  const { tags, excludeTags, collections, subjectType } = queueFilters
  if (
    !tags?.filter(Boolean).length &&
    !excludeTags?.length &&
    !collections?.length &&
    !subjectType
  ) {
    return <>Filters</>
  }

  const inclusions: string[] = []
  const exclusions: string[] = []

  if (subjectType === 'account') {
    inclusions.push('Only Accounts')
  }

  if (subjectType === 'record') {
    inclusions.push('Only Records')
  }

  if (tags?.length) {
    inclusions.push(buildTagFilterSummary(tags))
  }

  excludeTags?.forEach((tag) => {
    if (tag.startsWith('lang:')) {
      const langCode = tag.split(':')[1]
      exclusions.push(getLanguageFlag(langCode) || langCode)
      return
    }

    if (tag.startsWith('embed:')) {
      exclusions.push(tag.split(':')[1])
      return
    }

    exclusions.push(tag)
  })

  return (
    <>
      {!!inclusions.length && inclusions.join(' ')}
      {!!collections?.length && (
        <span
          className={classNames(
            inclusions.length
              ? 'border-l border-gray-400 ml-1 pl-1'
              : undefined,
          )}
        >
          Collections: {collections.map(getCollectionName).join(', ')}
        </span>
      )}
      {!!exclusions.length && (
        <span
          className={classNames(
            'line-through opacity-50',
            inclusions.length
              ? 'border-l border-gray-400 ml-1 pl-1'
              : undefined,
          )}
        >
          {exclusions.join(' ')}
        </span>
      )}
    </>
  )
}

const FilterButton = () => {
  const searchParams = useSearchParams()
  const queueFilters = useQueueFilterBuilder(searchParams)

  return (
    <Popover.Button className="text-sm flex flex-row items-center">
      <span className="text-gray-700 dark:text-gray-100">
        <FilterSummary queueFilters={queueFilters} />
      </span>
      <ChevronDownIcon className="dark:text-gray-50 w-4 h-4" />
    </Popover.Button>
  )
}

export const QueueFilterPanel = () => {
  return (
    <Popover>
      {({ open }) => (
        <>
          <FilterButton />
          {/* Use the `Transition` component. */}
          <Transition
            show={open}
            enter="transition duration-100 ease-out"
            enterFrom="transform scale-95 opacity-0"
            enterTo="transform scale-100 opacity-100"
            leave="transition duration-75 ease-out"
            leaveFrom="transform scale-100 opacity-100"
            leaveTo="transform scale-95 opacity-0"
          >
            <Popover.Panel className="absolute left-0 z-10 mt-1 flex max-w-max -translate-x-1/5 px-4">
              <div className="flex-auto w-96 rounded bg-white dark:bg-slate-800 p-4 text-sm leading-6 shadow-lg dark:shadow-slate-900 ring-1 ring-gray-900/5">
                <div className="flex flex-row px-2 gap-6">
                  <QueueFilterSubjectType />
                </div>

                <QueueFilterStats />

                <QueueFilterTags />
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  )
}

export default QueueFilterPanel
