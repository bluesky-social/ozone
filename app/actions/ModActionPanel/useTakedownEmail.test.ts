import { describe, expect, it } from 'vitest'
import { compileTakedownEmail, type CompileTemplateInput } from './useTakedownEmail'

const input: CompileTemplateInput = {
  handle: 'example.test',
  subjectName: 'Post',
  recordContent: 'Example post content.',
  totalStrikes: 1,
  previousStrikes: 0,
  policyConfig: { name: 'Example policy' },
  severityLevelConfig: {
    name: 'Example severity',
    strikeCount: 1,
    contentEmailSummary: 'Content-level explanation.',
    accountEmailSummary: 'Account-level explanation.',
  },
}

describe('automated takedown email copy', () => {
  it('uses account summaries and appeal instructions without claiming a post removal', () => {
    const email = compileTakedownEmail({ ...input, subjectName: 'account' })
    expect(email).toContain('reviewed activity on your account')
    expect(email).toContain('Account-level explanation.')
    expect(email).toContain('in-app appeal tool')
    expect(email).not.toContain('Content-level explanation.')
    expect(email).not.toContain(input.recordContent)
    expect(email).not.toContain('The following')
    expect(email).not.toContain('by emailing')
  })

  it('retains the content summary, removed content, and email appeal instructions for a post', () => {
    const email = compileTakedownEmail(input)
    expect(email).toContain('reviewed a Post on your account')
    expect(email).toContain('Content-level explanation.')
    expect(email).toContain('The following Post was removed:')
    expect(email).toContain(input.recordContent)
    expect(email).toContain('by emailing')
    expect(email).not.toContain('Account-level explanation.')
    expect(email).not.toContain('in-app appeal tool')
  })

  it('uses account wording for a zero-strike permanent takedown', () => {
    const email = compileTakedownEmail({
      ...input,
      subjectName: 'account',
      totalStrikes: 0,
      isPermanent: true,
      severityLevelConfig: { ...input.severityLevelConfig!, strikeCount: 0 },
    })
    expect(email).toContain('reviewed activity on your account')
    expect(email).toContain('You will no longer be able to access this account.')
    expect(email).toContain('in-app appeal tool')
    expect(email).not.toContain('reviewed a account')
    expect(email).not.toContain(input.recordContent)
  })

  it('retains the removal wording for a zero-strike content takedown', () => {
    const email = compileTakedownEmail({
      ...input,
      totalStrikes: 0,
      severityLevelConfig: { ...input.severityLevelConfig!, strikeCount: 0 },
    })
    expect(email).toContain('reviewed a Post on your account @example.test and removed it')
    expect(email).toContain('no new strikes have been applied')
    expect(email).toContain(input.recordContent)
    expect(email).not.toContain('Content-level explanation.')
    expect(email).not.toContain('Account-level explanation.')
  })

  it('retains content context when a post violation also triggers an account suspension', () => {
    const email = compileTakedownEmail({
      ...input,
      totalStrikes: 8,
      previousStrikes: 7,
      thresholdCrossed: 8,
      suspensionDuration: '1 day',
      suspensionEndDate: '1st Jan, 2027',
    })
    expect(email).toContain('reviewed a Post on your account')
    expect(email).toContain('Content-level explanation.')
    expect(email).toContain(input.recordContent)
    expect(email).toContain('your account has been suspended for 1 day')
    expect(email).not.toContain('Account-level explanation.')
  })
})
