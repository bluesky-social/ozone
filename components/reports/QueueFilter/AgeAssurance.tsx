import { XCircleIcon, ChevronDownIcon } from '@heroicons/react/24/solid'
import { useQueueFilter } from '../useQueueFilter'
import { AGE_ASSURANCE_STATES } from '@/mod-event/constants'
import { Dropdown } from '@/common/Dropdown'

export const QueueFilterAgeAssurance = () => {
  const { queueFilters, setAgeAssuranceState } = useQueueFilter()

  const selectedState = queueFilters.ageAssuranceState
  const hasAgeAssuranceFilter = !!selectedState

  // Only show age assurance filter when no subject type is selected or account type is selected
  const shouldShow = !queueFilters.subjectType || queueFilters.subjectType === 'account'

  if (!shouldShow) {
    return null
  }

  return (
    <div className='px-2 mt-4'>
      <h3 className="text-gray-900 dark:text-gray-200 mb-2">
        <button
          type="button"
          className="flex flex-row items-center"
          onClick={() => {
            if (hasAgeAssuranceFilter) {
              setAgeAssuranceState(undefined)
            }
          }}
        >
          Age Assurance State
          {hasAgeAssuranceFilter && <XCircleIcon className="h-4 w-4 ml-1" />}
        </button>
      </h3>

      <Dropdown
        className="inline-flex justify-center rounded-md border border-gray-300 dark:border-teal-500 bg-white dark:bg-slate-800 dark:text-gray-100 dark:focus:border-teal-500  dark px-2 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700"
        items={[
          {
            id: 'all',
            text: 'All States',
            onClick: () => setAgeAssuranceState(undefined),
          },
          ...Object.values(AGE_ASSURANCE_STATES).map((state) => ({
            id: state,
            text: state.charAt(0).toUpperCase() + state.slice(1),
            onClick: () => setAgeAssuranceState(state),
          })),
        ]}
      >
        {selectedState
          ? selectedState.charAt(0).toUpperCase() + selectedState.slice(1)
          : 'All States'}
        <ChevronDownIcon
          className="ml-1 h-4 w-4 text-violet-200 hover:text-violet-100"
          aria-hidden="true"
        />
      </Dropdown>
    </div>
  )
}