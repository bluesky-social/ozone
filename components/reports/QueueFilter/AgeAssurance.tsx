import { XCircleIcon } from '@heroicons/react/24/solid'
import { useQueueFilter } from '../useQueueFilter'
import { AgeAssuranceBadgeButton } from '@/mod-event/AgeAssuranceStateBadge'
import { AGE_ASSURANCE_STATES } from '@/mod-event/constants'

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

      <div className="flex flex-row gap-1">
        {Object.values(AGE_ASSURANCE_STATES).map((state) => {
          const isSelected = selectedState === state
          return (
            <AgeAssuranceBadgeButton
              key={state}
              ageAssuranceState={state}
              isHighlighted={isSelected}
              onClick={() => {
                const newState = isSelected ? undefined : state
                setAgeAssuranceState(newState)
              }}
            />
          )
        })}
      </div>
    </div>
  )
}