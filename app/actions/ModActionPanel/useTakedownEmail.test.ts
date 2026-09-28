import { describe, expect, it } from 'vitest'
import {
  compileTakedownEmail,
  compileTakedownSubject,
  prepareTakedownEmail,
  type CompileTemplateInput,
} from './useTakedownEmail'

const input: CompileTemplateInput = {
  handle: 'author.test',
  subjectName: 'post',
  recordContent: 'Removed content',
  totalStrikes: 8,
  previousStrikes: 7,
  thresholdCrossed: 8,
  suspensionDuration: '3 days',
  suspensionEndDate: '1st October, 2026',
  policyConfig: { name: 'Spam' },
  severityLevelConfig: { name: 'Spam', strikeCount: 1 },
}

describe('takedown notifications', () => {
  it('describes a newly applied suspension', () => {
    expect(compileTakedownSubject(input)).toContain('Account Suspended')
    expect(compileTakedownEmail(input)).toContain('suspended for 3 days')
    expect(compileTakedownEmail(input)).toContain('1st October, 2026')
  })

  it('describes an additional period and includes the combined end date', () => {
    const content = compileTakedownEmail({
      ...input,
      suspensionExtended: true,
      suspensionDuration: '7 days',
      suspensionEndDate: '7th October, 2026',
    })
    expect(content).toContain('suspension has been extended by 7 days')
    expect(content).toContain('7th October, 2026')
    expect(content).not.toContain('suspended for 7 days')
  })

  it.each([
    input,
    { ...input, totalStrikes: 16, isPermanent: true },
    { ...input, severityLevelConfig: { name: 'Spam', needsTakedown: true } },
  ])(
    'does not announce a new suspension or ban when preserving an existing restriction',
    (details) => {
      const emailInput = { ...details, accountRestrictionUnchanged: true }
      const content = compileTakedownEmail(emailInput)
      expect(compileTakedownSubject(emailInput)).toContain('Account Notice')
      expect(content).toContain('Removed content')
      expect(content).toContain(
        'Your existing account restriction remains unchanged.',
      )
      expect(content).not.toContain('suspended for 3 days')
      expect(content).not.toContain('1st October, 2026')
      expect(content).not.toContain('permanently removed')
      expect(content).not.toContain('no longer be able to access')
    },
  )

  it('preserves account-level takedown notification behavior', () => {
    expect(
      compileTakedownEmail({
        ...input,
        subjectName: 'account',
        isPermanent: true,
      }),
    ).toContain('You will no longer be able to access this account.')
  })

  it('corrects an unedited generated email when the account is already taken down at submission', () => {
    const generated = {
      input,
      content: compileTakedownEmail(input),
      subject: compileTakedownSubject(input),
    }
    const email = prepareTakedownEmail({
      ...generated,
      generated,
      accountRestrictionUnchanged: true,
    })
    expect(email.subject).toContain('Account Notice')
    expect(email.content).toContain('restriction remains unchanged')
    expect(email.content).not.toContain('suspended for 3 days')
  })

  it('requires review instead of overwriting an edited email after account state changes', () => {
    const generated = {
      input,
      content: compileTakedownEmail(input),
      subject: compileTakedownSubject(input),
    }
    expect(() =>
      prepareTakedownEmail({
        ...generated,
        content: `${generated.content}\nAdditional explanation`,
        generated,
        accountRestrictionUnchanged: true,
      }),
    ).toThrow('Review the edited notification')
  })

  it('updates the end date when the live suspension is longer than the preview', () => {
    const details = { ...input, suspensionExtended: true }
    const generated = {
      input: details,
      content: compileTakedownEmail(details),
      subject: compileTakedownSubject(details),
    }
    const email = prepareTakedownEmail({
      ...generated,
      generated,
      accountRestrictionUnchanged: false,
      suspensionExtended: true,
      suspensionEndDate: '3rd October, 2026',
    })
    expect(email.content).toContain('extended by 3 days')
    expect(email.content).toContain('3rd October, 2026')
    expect(email.content).not.toContain('1st October, 2026')
  })

  it('requires review of an edited email when only the end date changes', () => {
    const generated = {
      input,
      content: compileTakedownEmail(input),
      subject: compileTakedownSubject(input),
    }
    expect(() =>
      prepareTakedownEmail({
        ...generated,
        generated,
        content: `${generated.content}\nAdditional explanation`,
        accountRestrictionUnchanged: false,
        suspensionEndDate: '3rd October, 2026',
      }),
    ).toThrow('Review the edited notification')
  })

  it('preserves edits to an extension notice when the submitted outcome matches', () => {
    const details = { ...input, suspensionExtended: true }
    const generated = {
      input: details,
      content: compileTakedownEmail(details),
      subject: compileTakedownSubject(details),
    }
    const edited = { content: 'Edited notice', subject: 'Edited subject' }
    expect(
      prepareTakedownEmail({
        ...edited,
        generated,
        accountRestrictionUnchanged: false,
        suspensionExtended: true,
        suspensionEndDate: input.suspensionEndDate,
      }),
    ).toEqual(edited)
  })

  it.each([false, true])(
    'describes a replacement when an existing restriction is upgraded (permanent: %s)',
    (isPermanent) => {
      const details = {
        ...input,
        isPermanent,
        accountRestrictionUnchanged: true,
      }
      const generated = {
        input: details,
        content: compileTakedownEmail(details),
        subject: compileTakedownSubject(details),
      }
      const email = prepareTakedownEmail({
        ...generated,
        generated,
        accountRestrictionUnchanged: false,
      })
      expect(email.content).not.toContain('restriction remains unchanged')
      expect(email.content).toContain(
        isPermanent
          ? 'You will no longer be able to access this account.'
          : 'suspended for 3 days',
      )
    },
  )

  it('preserves moderator edits when account state is unchanged', () => {
    const generated = {
      input,
      content: compileTakedownEmail(input),
      subject: compileTakedownSubject(input),
    }
    const edited = { content: 'Edited notice', subject: 'Edited subject' }
    expect(
      prepareTakedownEmail({
        ...edited,
        generated,
        accountRestrictionUnchanged: false,
      }),
    ).toEqual(edited)
  })

  it('preserves custom templates', () => {
    const custom = { content: 'Custom content', subject: 'Custom subject' }
    expect(
      prepareTakedownEmail({
        ...custom,
        generated: null,
        accountRestrictionUnchanged: true,
      }),
    ).toEqual(custom)
  })
})
