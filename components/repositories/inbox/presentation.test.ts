import { afterEach, describe, expect, it } from 'vitest'
import {
  appealLabel,
  countGraphemes,
  date,
  enforcementLabel,
  isAppealableAction,
  mergeActions,
  notificationHref,
  notificationLabel,
  notificationSubject,
  scopeLabel,
  accountStatusCopy,
  subjectActionCopy,
  appealableActionForSubject,
  accountSubjectNotice,
} from './presentation'
import type { InboxAction, InboxNotification } from './api'

const originalTimezone = process.env.TZ
afterEach(() => {
  if (originalTimezone === undefined) delete process.env.TZ
  else process.env.TZ = originalTimezone
})
const notification = (
  target: InboxNotification['target'],
  reason = 'actionTaken',
): InboxNotification => ({
  id: 1,
  createdAt: '2026-10-01T00:00:00Z',
  isRead: false,
  target,
  reason,
})

describe('inbox presentation', () => {
  it('matches app account status copy while distinguishing strikes from enforcement', () => {
    expect(accountStatusCopy({ standing: 'good' })).toBeUndefined()
    expect(
      accountStatusCopy({
        standing: 'warning',
        enforcement: { state: 'none' },
        hasActiveStrikes: true,
      }),
    ).toMatchObject({
      title: 'Your account has strikes against it',
      description: expect.stringContaining(
        'strikes have been added to your record',
      ),
      disclaimer: expect.stringContaining(
        'Strikes come off your record over time.',
      ),
    })
    expect(
      accountStatusCopy({
        standing: 'atRisk',
        enforcement: { state: 'none' },
        hasActiveStrikes: true,
      }),
    ).toMatchObject({
      title: 'Your account is at risk of permanent suspension',
      description: expect.stringContaining(
        'Your record now carries enough strikes',
      ),
    })
    expect(
      accountStatusCopy({
        standing: 'atRisk',
        enforcement: { state: 'takendown' },
        hasActiveStrikes: false,
      }),
    ).toMatchObject({
      title: 'Your account has been suspended',
      disclaimer: undefined,
    })
    expect(
      accountStatusCopy({
        standing: 'atRisk',
        enforcement: { state: 'suspended', expiresAt: '2026-10-01T00:00:00Z' },
        hasActiveStrikes: true,
      }),
    ).toMatchObject({
      title: 'Your account is temporarily suspended',
      expiry: '2026-10-01T00:00:00Z',
      disclaimer: expect.stringContaining(
        'Strikes come off your record over time.',
      ),
    })
    expect(accountStatusCopy({ standing: 'atRisk' })?.title).toBe(
      'Your account may be suspended or at risk of suspension',
    )
    expect(
      accountStatusCopy({
        standing: 'warning',
        expiresAt: '2026-10-01T00:00:00Z',
      })?.expiry,
    ).toBe('2026-10-01T00:00:00Z')
  })

  it('uses the current action for record notice copy', () => {
    const action = (type: string): InboxAction => ({
      id: 1,
      type,
      createdAt: '2026-10-01T00:00:00Z',
    })
    const subject = {
      $type: 'com.atproto.repo.strongRef' as const,
      uri: 'at://did:plc:owner/app.bsky.feed.post/123',
      cid: 'bafyreid',
    }
    expect(subjectActionCopy(action('contentRestored'), subject).title).toBe(
      'Your post was restored',
    )
    expect(
      subjectActionCopy(action('labelRemoved'), subject, 'Adult Content'),
    ).toEqual({
      title: 'A label was removed from your post',
      summary: 'Label: Adult Content',
    })
  })

  it('targets an active account suspension rather than a newer label', () => {
    const subject = {
      subject: {
        $type: 'com.atproto.admin.defs#repoRef',
        did: 'did:plc:owner',
      },
      enforcement: { state: 'takendown' },
    } as Parameters<typeof appealableActionForSubject>[0]
    const label = {
      id: 2,
      type: 'labelApplied',
      createdAt: '2026-01-02T00:00:00Z',
    }
    const takedown = {
      id: 1,
      type: 'accountTakedown',
      createdAt: '2026-01-01T00:00:00Z',
    }
    expect(appealableActionForSubject(subject, [label, takedown])).toEqual(
      takedown,
    )
    expect(appealableActionForSubject(subject, [label])).toBeUndefined()
    expect(
      accountSubjectNotice({
        ...subject,
        actions: [
          {
            id: 3,
            type: 'communicationSent',
            createdAt: '2026-01-03T00:00:00Z',
          },
          takedown,
        ],
        appeal: {
          state: 'resolved',
          outcome: 'denied',
          resolvedAt: '2026-01-02T00:00:00Z',
        },
      } as Parameters<typeof accountSubjectNotice>[0]).title,
    ).toBe('Appeal denied')
  })

  it('keeps day-only report summary dates in UTC in western time zones', () => {
    process.env.TZ = 'America/Los_Angeles'
    expect(date('2026-10-01T00:00:00Z', false, true)).toBe(
      new Date('2026-10-01T12:00:00Z').toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    )
    expect(date('not-a-date')).toBe('—')
  })

  it('does not infer an action reversal or an appeal verdict from current state', () => {
    expect(enforcementLabel('none')).toBe('No active enforcement')
    expect(appealLabel({ state: 'pending' })).toBe('Under review')
    expect(appealLabel({ state: 'resolved' })).toBe('Reviewed')
    expect(scopeLabel('labelOnly')).toBe('Labels only')
  })

  it('uses explicit appeal outcomes and keeps unknown outcomes neutral', () => {
    expect(appealLabel({ state: 'resolved', ...{ outcome: 'approved' } })).toBe(
      'Approved',
    )
    expect(appealLabel({ state: 'resolved', ...{ outcome: 'denied' } })).toBe(
      'Denied',
    )
    expect(appealLabel({ state: 'resolved', ...{ outcome: 'future' } })).toBe(
      'Reviewed',
    )
    expect(appealLabel({ state: 'pending', ...{ outcome: 'approved' } })).toBe(
      'Under review',
    )
    const target = {
      $type: 'tools.ozone.inbox.defs#subjectRef' as const,
      subject: {
        $type: 'com.atproto.admin.defs#repoRef' as const,
        did: 'did:plc:target',
      },
    }
    expect(notificationLabel(notification(target, 'appealResolved'))).toBe(
      'Appeal reviewed',
    )
    expect(
      notificationLabel(
        notification(
          { ...target, ...{ appealOutcome: 'future' } },
          'appealResolved',
        ),
      ),
    ).toBe('Appeal reviewed')
    expect(
      notificationLabel(
        notification(
          { ...target, ...{ appealOutcome: 'denied' } },
          'appealResolved',
        ),
      ),
    ).toBe('Appeal denied')
    expect(
      notificationLabel(
        notification(
          { ...target, ...{ appealOutcome: 'approved' } },
          'actionTaken',
        ),
      ),
    ).toBe('Moderation action taken')
  })

  it('merges history pages by ID, including reversal and policy data', () => {
    const action: InboxAction = {
      id: 2,
      type: 'accountSuspended',
      createdAt: '2026-09-29T00:00:00Z',
    }
    const updated = {
      ...action,
      reversedAt: '2026-10-01T00:00:00Z',
      policies: [
        {
          key: 'spam',
          displayName: 'Spam policy',
          link: 'https://example.test/spam',
        },
      ],
    }
    expect(
      mergeActions([
        {
          actions: [
            action,
            { id: 4, type: 'labelApplied', createdAt: '2026-09-30T00:00:00Z' },
          ],
        },
        {
          actions: [
            updated,
            {
              id: 3,
              type: 'communicationSent',
              createdAt: '2026-09-30T00:00:00Z',
            },
          ],
        },
      ]),
    ).toEqual([
      { id: 4, type: 'labelApplied', createdAt: '2026-09-30T00:00:00Z' },
      { id: 3, type: 'communicationSent', createdAt: '2026-09-30T00:00:00Z' },
      updated,
    ])
    expect(isAppealableAction(action)).toBe(true)
    expect(isAppealableAction({ ...action, type: 'communicationSent' })).toBe(
      false,
    )
  })

  it('links report and subject notifications to selected inbox details', () => {
    const report = notification(
      { $type: 'tools.ozone.inbox.defs#reportRef', reportId: 101 },
      'reportResolved',
    )
    expect(notificationHref('did:plc:target', report)).toBe(
      '/repositories/did%3Aplc%3Atarget/inbox/reports?reportId=101',
    )
    expect(notificationLabel(report)).toBe('Report reviewed')
    const subject = {
      $type: 'com.atproto.repo.strongRef' as const,
      uri: 'at://did:plc:target/app.bsky.feed.post/old',
      cid: 'bafyreigklczuekgj7q2pj3ys5ck3ah7v2ps5qbly6viwcj26vrmigbfyce',
    }
    const action = notification({
      $type: 'tools.ozone.inbox.defs#subjectRef',
      subject,
    })
    expect(notificationSubject(action)).toEqual(subject)
    expect(notificationHref('did:plc:target', action)).toBe(
      '/repositories/did%3Aplc%3Atarget/inbox/actioned-subjects?subject=at%3A%2F%2Fdid%3Aplc%3Atarget%2Fapp.bsky.feed.post%2Fold',
    )
    const standing = notification(
      {
        $type: 'tools.ozone.inbox.defs#standingRef',
        standing: 'good',
        previousStanding: 'warning',
      },
      'standingChanged',
    )
    expect(notificationSubject(standing)).toBeUndefined()
    expect(notificationHref('did:plc:target', standing)).toBeUndefined()
  })

  it('counts emoji and combining sequences as graphemes for optional appeal reasons', () => {
    expect(countGraphemes('')).toBe(0)
    expect(countGraphemes('👨‍👩‍👧‍👦é')).toBe(2)
    expect(countGraphemes('👨‍👩‍👧‍👦'.repeat(2001))).toBe(2001)
  })
})
