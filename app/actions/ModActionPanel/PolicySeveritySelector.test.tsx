import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { ActionRecommendation } from '@/mod-event/helpers/useActionRecommendation'
import { PolicySeveritySelector } from './PolicySeveritySelector'

vi.mock('@/reports/ModerationForm/ActionPolicySelector', () => ({
  ActionPolicySelector: () => null,
}))
vi.mock('@/reports/ModerationForm/ActionSeverityLevelSelector', () => ({
  ActionSeverityLevelSelector: () => null,
}))

const suspension: ActionRecommendation = {
  totalStrikes: 8,
  recommendedDuration: 24,
  suspensionDurationInHours: 24,
  isPermanent: false,
  actualStrikesToApply: 1,
  message: 'Example recommendation',
}

function render({
  isAccountAction,
  actionRecommendation = null,
  variant = 'takedown',
}: {
  isAccountAction: boolean
  actionRecommendation?: ActionRecommendation | null
  variant?: 'takedown' | 'email' | 'reverse-takedown'
}) {
  return renderToStaticMarkup(
    <PolicySeveritySelector
      policyDetails={{ severityLevels: {} }}
      handlePolicySelect={() => {}}
      handleSeverityLevelSelect={() => {}}
      severityLevelStrikeCount={null}
      setTargetServices={() => {}}
      targetServices={['appview', 'pds']}
      isAccountAction={isAccountAction}
      actionRecommendation={actionRecommendation}
      variant={variant}
    />,
  )
}

describe('account takedown target services', () => {
  it('shows service selection for an account action without a suspension recommendation', () => {
    const markup = render({ isAccountAction: true })
    expect(markup).toContain('name="targetServices"')
    expect(markup).toContain('value="appview,pds"')
  })

  it('hides service selection when switching back to an ordinary content action', () => {
    expect(render({ isAccountAction: true })).toContain('name="targetServices"')
    expect(render({ isAccountAction: false })).not.toContain(
      'name="targetServices"',
    )
  })

  it('retains service selection when a content violation also suspends the account', () => {
    expect(
      render({ isAccountAction: false, actionRecommendation: suspension }),
    ).toContain('name="targetServices"')
  })

  it.each(['email', 'reverse-takedown'] as const)(
    'keeps service selection hidden for %s',
    (variant) => {
      expect(render({ isAccountAction: true, variant })).not.toContain(
        'name="targetServices"',
      )
    },
  )
})
