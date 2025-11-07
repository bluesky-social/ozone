import { Card } from '@/common/Card'
import { STRIKE_TO_SUSPENSION_DURATION_IN_HOURS } from '@/lib/constants'
import { pluralize } from '@/lib/util'
import { InformationCircleIcon } from '@heroicons/react/24/outline'

export function StrikeSuspensionConfig() {
  const entries = Object.entries(STRIKE_TO_SUSPENSION_DURATION_IN_HOURS).sort(
    ([a], [b]) => parseInt(a) - parseInt(b),
  )

  const formatDuration = (hours: number): string => {
    if (hours === Infinity) {
      return 'Permanent'
    }
    const days = hours / 24
    if (days < 1) {
      return pluralize(hours, 'hour')
    }
    return pluralize(days, 'day')
  }

  return (
    <>
      <h3 className="font-medium flex flex-row items-center gap-1">
        <InformationCircleIcon className="h-4 w-4" />
        Strike Suspension Thresholds
      </h3>
      <Card className="mt-2 py-3 px-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm mb-3">
              When a user accumulates strikes, automatic account suspensions are
              applied at these thresholds:
            </p>
            {entries.map(([strikes, hours]) => (
              <div
                key={strikes}
                className="py-2 border-b border-0.5 dark:border-gray-700 border-gray-100 flex justify-between"
              >
                <div className="font-semibold text-sm">{strikes}+ strikes</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {formatDuration(hours)}
                </div>
              </div>
            ))}
            <p className="text-xs pt-2 italic">
              Note: This configuration cannot be modified through the UI and
              requires an environment variable change.
            </p>
          </div>
        </div>
      </Card>
    </>
  )
}
