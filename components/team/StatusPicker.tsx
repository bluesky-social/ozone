import { Dropdown } from '@/common/Dropdown'
import { ChevronDownIcon } from '@heroicons/react/24/solid'

export const StatusPicker = ({
  selected,
  onSelect,
}: {
  selected?: boolean
  onSelect: (disabled?: boolean) => void
}) => {
  const selectedText =
    selected === undefined ? 'All' : selected ? 'Disabled' : 'Enabled'
  return (
    <Dropdown
      className="inline-flex justify-center items-center rounded border border-gray-300 dark:border-teal-500 bg-white dark:bg-slate-800 dark:text-gray-100 dark:focus:border-teal-500 dark px-2 py-0.5 text-xs text-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700"
      items={[
        {
          id: 'default',
          text: 'All',
          onClick: () => onSelect(),
        },
        {
          id: 'enabled',
          text: 'Enabled',
          onClick: () => onSelect(false),
        },
        {
          id: 'disabled',
          text: 'Disabled',
          onClick: () => onSelect(true),
        },
      ]}
    >
      <span className="px-1 py-0.5 inline-flex items-center gap-2">
        {selectedText}

        <ChevronDownIcon
          className="h-3 w-3 text-violet-200 hover:text-violet-100"
          aria-hidden="true"
        />
      </span>
    </Dropdown>
  )
}
