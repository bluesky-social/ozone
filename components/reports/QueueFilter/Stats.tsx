import { FormLabel, Input } from '@/common/forms'
import { useQueueFilter } from '../useQueueFilter'

export const QueueFilterStats = () => {
  const {
    queueFilters,
    setMinPriorityScore,
  } = useQueueFilter()

  const handleInputChange =
    (handler: (val?: number) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      if (inputValue === '') {
        handler(undefined)
      } else if (/^\d*$/.test(inputValue)) {
        // Allow only digits by filtering non-numeric characters
        handler(Number(inputValue))
      }
    }
  return (
    <div className="flex flex-row gap-6">
      <div className="px-2 mt-4">
        <div className="flex flex-row gap-2">
          <FormLabel label="Min. Priority score">
            <Input
              type="number"
              id="minPriorityScore"
              className="block w-full"
              name="minPriorityScore"
              min={0}
              max={100}
              step={1}
              placeholder="0-100"
              value={queueFilters.minPriorityScore || ''}
              onChange={handleInputChange(setMinPriorityScore)}
            />
          </FormLabel>
        </div>
      </div>
    </div>
  )
}
