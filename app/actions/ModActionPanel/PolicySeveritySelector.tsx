import { ActionPolicySelector } from '@/reports/ModerationForm/ActionPolicySelector'
import { ActionSeverityLevelSelector } from '@/reports/ModerationForm/ActionSeverityLevelSelector'
import { pluralize } from '@/lib/util'

type ActionRecommendation = {
  message: string
  isPermanent?: boolean
  actualStrikesToApply?: number
}

type PolicySeveritySelectorProps = {
  // Required props
  policyDetails: {
    severityLevels?: Record<string, { description: string; isDefault: boolean }>
  } | null
  isSubjectDid: boolean
  handlePolicySelect: (policyName: string) => void
  handleSeverityLevelSelect: (levelName: string) => void

  // Optional props for REVERSE_TAKEDOWN auto-selection
  defaultPolicy?: string
  defaultSeverityLevel?: string

  // Optional props for strike display
  severityLevelStrikeCount: number | null
  currentStrikes?: number
  actionRecommendation?: ActionRecommendation | null

  // Variant-specific behavior
  variant?: 'takedown' | 'email' | 'reverse-takedown'
}

export function PolicySeveritySelector({
  policyDetails,
  isSubjectDid,
  handlePolicySelect,
  handleSeverityLevelSelect,
  defaultPolicy,
  defaultSeverityLevel,
  severityLevelStrikeCount,
  currentStrikes = 0,
  actionRecommendation,
  variant = 'takedown',
}: PolicySeveritySelectorProps) {
  const isReverseTakedown = variant === 'reverse-takedown'
  const showFullRecommendation = variant === 'takedown' || variant === 'email'

  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="w-full">
        <ActionPolicySelector
          name="policies"
          defaultPolicy={defaultPolicy}
          onSelect={handlePolicySelect}
        />
      </div>
      {policyDetails && !isSubjectDid && (
        <div className="flex flex-col gap-1">
          <ActionSeverityLevelSelector
            name="severityLevel"
            defaultSeverityLevel={defaultSeverityLevel}
            policySeverityLevels={policyDetails.severityLevels}
            onSelect={handleSeverityLevelSelect}
          />
          {severityLevelStrikeCount !== null && (
            <>
              <input
                type="hidden"
                name="strikeCount"
                value={
                  isReverseTakedown
                    ? -Math.abs(severityLevelStrikeCount)
                    : actionRecommendation?.actualStrikesToApply ??
                      severityLevelStrikeCount
                }
              />
              {showFullRecommendation &&
                (currentStrikes > 0 || actionRecommendation) && (
                  <div className="flex flex-row items-center gap-1 flex-wrap text-xs">
                    {currentStrikes > 0 && (
                      <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                        Current: {pluralize(currentStrikes, 'strike')}
                      </span>
                    )}
                    {actionRecommendation && (
                      <span
                        className={`px-1.5 py-0.5 rounded ${
                          actionRecommendation.isPermanent
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                        }`}
                      >
                        → {actionRecommendation.message}
                      </span>
                    )}
                  </div>
                )}
              {isReverseTakedown && actionRecommendation && (
                <div className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs">
                  → {actionRecommendation.message}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
