import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/solid'
import { Combobox, Transition } from '@headlessui/react'
import { Fragment, useState } from 'react'
import { isNonNullable } from '@/lib/util'
import { useQueueFilter } from '../useQueueFilter'
import { LabelChip } from '@/common/labels'
import { ActionButton } from '@/common/buttons'

const availableTagOptions = {
  report: {
    text: 'Report',
    options: [
      { text: 'Spam', value: 'report:spam' },
      { text: 'Violation', value: 'report:violation' },
      { text: 'Misleading', value: 'report:misleading' },
    ],
  },
  lang: {
    text: 'Language',
    options: [
      { text: 'English', value: 'lang:en' },
      { text: 'Portuguese', value: 'lang:pt' },
      { text: 'Spanish', value: 'lang:es' },
      { text: 'French', value: 'lang:fr' },
    ],
  },
  embed: {
    text: 'Embed',
    options: [
      { text: 'Image', value: 'embed:image' },
      { text: 'Video', value: 'embed:video' },
      { text: 'Link/External', value: 'embed:external' },
    ],
  },
}

export const QueueFilterTags = () => {
  const { addTags, queueFilters } = useQueueFilter()
  // @TODO: This should move to dynamic indexing
  const currentTags = queueFilters.tags ?? ['']
  console.log(queueFilters.tags)

  return (
    <div className="px-2 mt-2">
      <h3 className="text-gray-900 dark:text-gray-200 my-2">Tag Filters</h3>
      {currentTags.map((tags, i) => {
        const fragments = tags.split('&&').filter(Boolean)
        return (
          <>
            {i > 0 && <div className="dark:text-gray-200">OR</div>}
            <div className="mb-1">
              {fragments.map((tag, i) => {
                return (
                  <>
                    <LabelChip key={tag}>{tag}</LabelChip>
                    {i + 1 < fragments.length && (
                      <span className="text-gray-200">AND</span>
                    )}
                  </>
                )
              })}
              {i + 1 === currentTags.length && fragments.length > 0 && (
                <button
                  onClick={() => addTags(currentTags.length, [''])}
                  className="text-gray-200"
                >
                  AND
                </button>
              )}
            </div>
          </>
        )
      })}
      <QueueFilterTag
        selected={currentTags[currentTags.length - 1]}
        onSelect={(selections) => addTags(currentTags.length - 1, selections)}
      />
    </div>
  )
}

export const QueueFilterTag = ({
  selected,
  onSelect,
}: {
  selected: string
  onSelect: (tags: string[]) => void
}) => {
  const [query, setQuery] = useState('')
  const filteredTagOptions = Object.values(availableTagOptions)
    .map((group) => {
      const options = group.options.filter((option) =>
        option.text.toLowerCase().includes(query.toLowerCase()),
      )

      if (options.length) {
        return { ...group, options }
      }

      return null
    })
    .filter(isNonNullable)

  return (
    <Combobox
      multiple
      value={selected?.split('&&')}
      onChange={(selections) => {
        onSelect(selections)
      }}
      name="template"
    >
      <div className="relative mt-1">
        <div className="relative cursor-default overflow-hidden rounded-md bg-white dark:bg-slate-700 text-left shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm">
          <Combobox.Input
            className="w-full flex-1 rounded-md border-gray-300 dark:border-teal-500 dark:bg-slate-700 shadow-sm dark:shadow-slate-700 focus:border-indigo-500 focus:ring-indigo-500 dark:focus:ring-teal-500 sm:text-sm dark:text-gray-100"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type keyword or click the arrows on the right to see all templates"
          />
          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon
              className="h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
          </Combobox.Button>
        </div>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          afterLeave={() => setQuery('')}
        >
          <Combobox.Options className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
            {!filteredTagOptions.length && (
              <p className="px-3 py-2 dark:text-gray-100">
                No result for {`"${query}"`}
              </p>
            )}
            {filteredTagOptions.map((group) => {
              return (
                <div key={group.text}>
                  <p className="dark:text-gray-100 ml-3 my-1">{group.text}</p>
                  {group.options.map((option) => {
                    return (
                      <Combobox.Option
                        key={option.text}
                        className={({ active }) =>
                          `relative cursor-default select-none py-2 pl-10 pr-4 ${
                            active
                              ? 'bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-gray-200'
                              : 'text-gray-900 dark:text-gray-200'
                          }`
                        }
                        value={option.value}
                      >
                        {({ selected, active }) => (
                          <>
                            {selected ? (
                              <span
                                className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                  active ? 'text-indigo-900' : 'text-indigo-600'
                                }`}
                              >
                                <CheckIcon
                                  className="h-5 w-5 dark:text-gray-50"
                                  aria-hidden="true"
                                />
                              </span>
                            ) : null}
                            <div className="flex flex-row">
                              <span
                                className={`block truncate ${
                                  selected ? 'font-medium' : 'font-normal'
                                }`}
                              >
                                {option.text}
                              </span>
                            </div>
                          </>
                        )}
                      </Combobox.Option>
                    )
                  })}
                </div>
              )
            })}
          </Combobox.Options>
        </Transition>
      </div>
    </Combobox>
  )
}
