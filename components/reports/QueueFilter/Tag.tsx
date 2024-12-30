import { XCircleIcon } from '@heroicons/react/24/solid'
import { classNames } from '@/lib/util'
import { useQueueFilter } from '../useQueueFilter'
import { ActionButton } from '@/common/buttons'
import Select from 'react-tailwindcss-select'

const availableTagOptions = {
  report: {
    text: 'Report Type',
    options: [
      { text: 'Spam', value: 'report:spam' },
      { text: 'Rude', value: 'report:rude' },
      { text: 'Other', value: 'report:other' },
      { text: 'Violation', value: 'report:violation' },
      { text: 'Misleading', value: 'report:misleading' },
    ],
  },
  embed: {
    text: 'Embedded Content',
    options: [
      { text: 'Image', value: 'embed:image' },
      { text: 'Video', value: 'embed:video' },
      { text: 'Link/External', value: 'embed:external' },
    ],
  },
  lang: {
    text: 'Language',
    options: [
      { text: 'English', value: 'lang:en' },
      { text: 'Portuguese', value: 'lang:pt' },
      { text: 'Spanish', value: 'lang:es' },
      { text: 'French', value: 'lang:fr' },
      { text: 'Japanese', value: 'lang:ja' },
      { text: 'German', value: 'lang:de' },
      { text: 'Italian', value: 'lang:it' },
      { text: 'Korean', value: 'lang:ko' },
      { text: 'Russian', value: 'lang:ru' },
      { text: 'Chinese', value: 'lang:zh' },
      { text: 'Arabic', value: 'lang:ar' },
      { text: 'Unknown', value: 'lang:und' },
    ],
  },
}

const getTagOptions = (subjectType?: string) => {
  const { embed, ...rest } = availableTagOptions
  return Object.values(subjectType === 'account' ? rest : availableTagOptions)
}

const selectClassNames = {
  tagItemIconContainer:
    'flex items-center px-1 cursor-pointer rounded-r-sm hover:bg-red-200 hover:text-red-600 dark:text-slate-900',
  menuButton: ({ isDisabled }: { isDisabled?: boolean } = {}) =>
    classNames(
      isDisabled ? 'bg-gray-200' : 'bg-white hover:border-gray-400 focus:ring',
      'flex text-sm text-gray-500 border border-gray-300 rounded shadow-sm transition-all duration-300 focus:outline-none dark:bg-slate-700 dark:text-gray-100',
    ),
  menu: 'absolute z-10 w-full bg-white shadow-lg border rounded py-1 mt-1.5 text-sm text-gray-700 dark:bg-slate-700 dark:text-gray-100',
  searchBox:
    'w-full py-2 pl-8 text-sm text-gray-500 bg-gray-100 border border-gray-200 rounded focus:border-gray-200 focus:ring-0 focus:outline-none dark:bg-slate-800 dark:text-gray-100',
  listGroupLabel:
    'pr-2 py-2 cursor-default select-none truncate text-gray-700 dark:text-gray-100',
  listItem: ({ isSelected }: { isSelected?: boolean } = {}) => {
    const baseClass =
      'block transition duration-200 px-2 py-2 cursor-pointer select-none truncate rounded dark:hover:bg-slate-800 dark:hover:text-gray-200'
    const selectedClass = isSelected
      ? `text-white`
      : `text-gray-500 dark:text-gray-300`

    return classNames(baseClass, selectedClass)
  },
  tagItemText: `text-gray-600 text-xs truncate cursor-default select-none`,
}

export const QueueFilterTags = () => {
  const { addTags, updateTagExclusions, clearTags, queueFilters } =
    useQueueFilter()
  const currentTags = queueFilters.tags ?? ['']
  const hasTagFilters = currentTags.filter(Boolean).length > 0
  const lastFragmentHasTags = !!currentTags[currentTags.length - 1].length
  const allExcludedTags = queueFilters.excludeTags?.join()
  const allTagFilters = currentTags.join()

  const allTagOptions = getTagOptions(queueFilters.subjectType)
  // If a tag is already set to be excluded, don't let that tag be set as a filter
  const tagOptions = allExcludedTags?.length
    ? allTagOptions.map((group) => {
        return {
          ...group,
          options: group.options.filter(
            (option) => !allExcludedTags.includes(option.value),
          ),
        }
      })
    : allTagOptions

  // If a tag is already set in the filters, don't let that tag be set as an exclusion
  const exclusionTagOptions = allTagFilters.length
    ? allTagOptions.map((group) => {
        return {
          ...group,
          options: group.options.filter(
            (option) => !allTagFilters.includes(option.value),
          ),
        }
      })
    : allTagOptions

  const currentTagExclusions = queueFilters.excludeTags ?? []
  const hasTagExclusions = currentTagExclusions.length > 0

  return (
    <div className="px-2 mt-4">
      <h3 className="text-gray-900 dark:text-gray-200 my-2">
        <button
          type="button"
          className="flex flex-row items-center"
          onClick={() => {
            if (hasTagFilters) {
              clearTags()
            }
          }}
        >
          Subject With Tags
          {hasTagFilters && <XCircleIcon className="h-4 w-4 ml-1" />}
        </button>
      </h3>
      {currentTags.map((tags, i) => {
        const fragments = tags.split('&&').filter(Boolean)
        return (
          <>
            {i > 0 && (
              <div className="dark:text-gray-200">
                <button
                  type="button"
                  className="flex flex-row items-center"
                  onClick={() => addTags(i, [])}
                >
                  OR <XCircleIcon className="ml-1 w-3 h-3" />
                </button>
              </div>
            )}
            <Select
              primaryColor="indigo"
              isMultiple
              isSearchable
              // These classes are massive because we are basically
              classNames={selectClassNames}
              value={fragments.map((tag) => ({ label: tag, value: tag }))}
              onChange={(selections) =>
                addTags(
                  i,
                  Array.isArray(selections)
                    ? selections.map((s) => s.value)
                    : [],
                )
              }
              options={tagOptions.map((group) => ({
                label: group.text,
                options: group.options.map((option) => ({
                  label: option.text,
                  value: option.value,
                  isSelected: fragments.includes(option.value),
                })),
              }))}
            />
          </>
        )
      })}
      {lastFragmentHasTags && (
        <ActionButton
          appearance="outlined"
          size="xs"
          className="mt-2"
          onClick={() => {
            addTags(currentTags.length, [''])
          }}
        >
          Add OR Filter
        </ActionButton>
      )}
      <h3 className="text-gray-900 dark:text-gray-200 my-2">
        <button
          type="button"
          className="flex flex-row items-center"
          onClick={() => {
            if (hasTagExclusions) {
              updateTagExclusions([])
            }
          }}
        >
          Subject Without Tags
          {hasTagExclusions && <XCircleIcon className="h-4 w-4 ml-1" />}
        </button>
      </h3>

      <Select
        primaryColor="indigo"
        isMultiple
        isSearchable
        // These classes are massive because we are basically
        classNames={selectClassNames}
        value={currentTagExclusions.map((tag) => ({ label: tag, value: tag }))}
        onChange={(selections) =>
          updateTagExclusions(
            Array.isArray(selections) ? selections.map((s) => s.value) : [],
          )
        }
        options={exclusionTagOptions.map((group) => ({
          label: group.text,
          options: group.options.map((option) => ({
            label: option.text,
            value: option.value,
            isSelected: currentTagExclusions.includes(option.value),
          })),
        }))}
      />
    </div>
  )
}
