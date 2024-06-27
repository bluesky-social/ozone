import { ChevronDownIcon } from '@heroicons/react/24/solid'
import { Dropdown } from '../Dropdown'
import { TypeFilterKey, TypeFiltersByKey } from './constants'

export const PostFilter = ({
  selectedType = 'no_filter',
  setSelectedType,
}: {
  selectedType: TypeFilterKey
  setSelectedType: (type: TypeFilterKey) => void
}) => {
  const selectedText = TypeFiltersByKey[selectedType].text

  return (
    <div className="flex gap-1">
      <Dropdown
        className="inline-flex justify-center rounded-md border border-gray-300 dark:border-teal-500 bg-white dark:bg-slate-800 dark:text-gray-100 dark:focus:border-teal-500  dark px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700"
        items={Object.values(TypeFiltersByKey).map(({ key, text }) => ({
          text,
          id: key,
          onClick: () => setSelectedType(key),
        }))}
        data-cy="post-type-selector"
      >
        {selectedText}

        <ChevronDownIcon
          className="ml-2 -mr-1 h-5 w-5 text-violet-200 hover:text-violet-100"
          aria-hidden="true"
        />
      </Dropdown>
    </div>
  )
}
