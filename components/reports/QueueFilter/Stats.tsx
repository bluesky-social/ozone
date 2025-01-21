import { FormLabel, Input } from '@/common/forms'
import { useQueueFilter } from '../useQueueFilter'

export const QueueFilterStats = () => {
  const {
    queueFilters,
    setMinAccountSuspendCount,
    setMinReportedRecordsCount,
    setMinTakendownRecordsCount,
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
          <FormLabel label="Min. Suspension count" className="mb-2">
            <Input
              type="number"
              className="block w-full"
              id="minAccountSuspendCount"
              name="minAccountSuspendCount"
              value={queueFilters.minAccountSuspendCount || ''}
              onChange={handleInputChange(setMinAccountSuspendCount)}
            />
          </FormLabel>
          <FormLabel label="Min. Reported records">
            <Input
              type="number"
              className="block w-full"
              id="minReportedRecordsCount"
              name="minReportedRecordsCount"
              value={queueFilters.minReportedRecordsCount || ''}
              onChange={handleInputChange(setMinReportedRecordsCount)}
            />
          </FormLabel>
        </div>
        <FormLabel label="Min. Takendown records">
          <Input
            type="number"
            className="block w-full"
            id="minTakendownRecordsCount"
            name="minTakendownRecordsCount"
            value={queueFilters.minTakendownRecordsCount || ''}
            onChange={handleInputChange(setMinTakendownRecordsCount)}
          />
        </FormLabel>
      </div>
    </div>
  )
}
