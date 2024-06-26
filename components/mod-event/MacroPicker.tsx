import { Dropdown } from '@/common/Dropdown'
import { ChevronDownIcon } from '@heroicons/react/24/solid'
import { useFilterMacroList } from './useFilterMacrosList'
import { EventListState } from './useModEventList'

export const MacroList = ({
  selectedMacro,
  setSelectedMacro,
}: {
  selectedMacro: string
  setSelectedMacro: (selection: string, item: Partial<EventListState>) => void
}) => {
  const {
    data: macroList,
    isFetching: isLoadingMacroList,
    error: errorMacroList,
  } = useFilterMacroList()

  return (
    <Dropdown
      className="inline-flex justify-center rounded-md border border-gray-300 dark:border-teal-500 bg-white dark:bg-slate-800 dark:text-gray-100 dark:focus:border-teal-500  dark px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700"
      items={
        !macroList
          ? []
          : Object.entries(macroList).map(([name, item]) => ({
              text: name,
              onClick: () => setSelectedMacro(name, item.filters),
            }))
      }
      data-cy="macro-selector"
    >
      {selectedMacro ||
        (isLoadingMacroList
          ? 'Loading macros...'
          : !macroList
          ? 'No macros found'
          : 'No macros selected')}

      {!isLoadingMacroList && (
        <ChevronDownIcon
          className="ml-2 -mr-1 h-5 w-5 text-violet-200 hover:text-violet-100"
          aria-hidden="true"
        />
      )}
    </Dropdown>
  )
}
