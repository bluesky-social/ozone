import { Checkbox } from '@/common/forms'
import { SeverityLevelDetail } from '@/setting/severity-level/types'
import { STRIKE_TO_SUSPENSION_DURATION_IN_HOURS } from '@/lib/constants'
import { TakedownTargetService } from '@/lib/types'

type TargetServicesSelectorProps = {
  value: TakedownTargetService[]
  onChange: (services: TakedownTargetService[]) => void
  className?: string
}

// Helper function to check if targetServices should be shown for a severity level
export const shouldShowTargetServices = (
  level: SeverityLevelDetail | null,
): boolean => {
  if (!level) return false

  // Show if needsTakedown is true
  if (level.needsTakedown) {
    return true
  }

  // Show if strikeCount meets or exceeds any suspension threshold
  if (level.strikeCount) {
    const thresholds = Object.keys(STRIKE_TO_SUSPENSION_DURATION_IN_HOURS).map(
      (k) => parseInt(k, 10),
    )

    return thresholds.some((threshold) => level.strikeCount! >= threshold)
  }

  return false
}

export function TargetServicesSelector({
  value,
  onChange,
  className = '',
}: TargetServicesSelectorProps) {
  const toggleService = (service: TakedownTargetService, checked: boolean) => {
    let newServices: TakedownTargetService[]
    if (checked) {
      // Add service if not already present
      newServices = value.includes(service) ? value : [...value, service]
    } else {
      // Remove service, but ensure at least one remains
      newServices = value.filter((s) => s !== service)
      if (newServices.length === 0) {
        // Don't allow unchecking if it's the last one
        return
      }
    }
    onChange(newServices)
  }

  return (
    <div
      className={`pl-2 border-l-2 border-gray-200 dark:border-gray-700 ${className}`}
    >
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
        Target Services for account takedown (at least one must be selected):
      </p>
      <div className="flex flex-row gap-2">
        <Checkbox
          id="target-appview"
          name="target-appview"
          checked={value.includes('appview')}
          onChange={(e) => toggleService('appview', e.target.checked)}
          label="AppView"
          className="text-sm"
        />
        <Checkbox
          id="target-pds"
          name="target-pds"
          checked={value.includes('pds')}
          onChange={(e) => toggleService('pds', e.target.checked)}
          label="PDS"
          className="text-sm"
        />
      </div>
      {/* Hidden inputs to submit targetServices with form */}
      <input type="hidden" name="targetServices" value={value.join(',')} />
    </div>
  )
}
