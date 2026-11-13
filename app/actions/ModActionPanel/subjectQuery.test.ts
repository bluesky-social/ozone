import { describe, expect, it, vi } from 'vitest'
import type { Agent, ToolsOzoneModerationDefs } from '@atproto/api'
import {
  fetchModActionSubject,
  findMessageStatus,
  getActionLabels,
} from './subjectQuery'

describe('action subject context', () => {
  it('uses account labels when applying an action to the account', () => {
    const account = {
      labels: [{ val: 'account-label' }],
    } as unknown as ToolsOzoneModerationDefs.RepoViewDetail
    const record = {
      labels: [{ val: 'record-label' }],
    } as unknown as ToolsOzoneModerationDefs.RecordViewDetail
    const messageLabels = [{ val: 'message-label' }] as NonNullable<
      ToolsOzoneModerationDefs.RecordViewDetail['labels']
    >
    for (const isMessageSubject of [false, true]) {
      expect(
        getActionLabels({
          applyToAccount: true,
          isSubjectDid: false,
          isMessageSubject,
          targetAccount: account,
          messageLabels,
          record,
        }),
      ).toEqual(account.labels)
      expect(
        getActionLabels({
          applyToAccount: false,
          isSubjectDid: false,
          isMessageSubject,
          targetAccount: account,
          messageLabels,
          record,
        }),
      ).toEqual(isMessageSubject ? messageLabels : record.labels)
    }
  })
  it('selects the message status for the correct conversation', () => {
    const ref = {
      $type: 'chat.bsky.convo.defs#messageRef',
      did: 'did:plc:alice',
      messageId: 'm',
      convoId: 'one',
    } as const
    const statuses = [
      { subject: { ...ref, convoId: 'two' }, reviewState: 'open' },
      { subject: ref, reviewState: 'closed' },
    ] as unknown as ToolsOzoneModerationDefs.SubjectStatusView[]
    expect(findMessageStatus(statuses, ref)).toBe(statuses[1])
    expect(findMessageStatus(statuses, { ...ref, convoId: 'three' })).toBeNull()
  })
  it.each(['chat.bsky.convo.message', 'chat.bsky.convo'])(
    'fetches account context without fetching a %s record',
    async (collection) => {
      const getRepo = vi
        .fn()
        .mockResolvedValue({ data: { did: 'did:plc:alice' } })
      const getRecord = vi.fn()
      const getProfile = vi
        .fn()
        .mockResolvedValue({ data: { handle: 'alice.test' } })
      const queryLabels = vi.fn().mockResolvedValue({ data: { labels: [] } })
      const agent = {
        tools: { ozone: { moderation: { getRepo, getRecord } } },
        app: { bsky: { actor: { getProfile } } },
        com: { atproto: { label: { queryLabels } } },
      } as unknown as Agent
      await expect(
        fetchModActionSubject(agent, `at://did:plc:alice/${collection}/id`),
      ).resolves.toMatchObject({
        repo: { did: 'did:plc:alice' },
        profile: { handle: 'alice.test' },
      })
      expect(getRecord).not.toHaveBeenCalled()
      expect(getRepo).toHaveBeenCalledWith({ did: 'did:plc:alice' })
      expect(queryLabels).toHaveBeenCalledTimes(
        collection.endsWith('.message') ? 1 : 0,
      )
    },
  )

  it('returns only active message labels across pages', async () => {
    const queryLabels = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          labels: [{ val: 'active' }, { val: 'negated', neg: true }],
          cursor: 'next',
        },
      })
      .mockResolvedValueOnce({
        data: { labels: [{ val: 'expired', exp: '2000-01-01T00:00:00Z' }] },
      })
    const agent = {
      tools: {
        ozone: {
          moderation: { getRepo: vi.fn().mockResolvedValue({ data: {} }) },
        },
      },
      app: {
        bsky: {
          actor: { getProfile: vi.fn().mockResolvedValue({ data: {} }) },
        },
      },
      com: { atproto: { label: { queryLabels } } },
    } as unknown as Agent
    const result = await fetchModActionSubject(
      agent,
      'at://did:plc:alice/chat.bsky.convo.message/id',
    )
    expect(result.labels).toEqual([{ val: 'active' }])
    expect(queryLabels).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ cursor: 'next' }),
    )
  })

  it('preserves account context if message label lookup fails', async () => {
    const agent = {
      tools: {
        ozone: {
          moderation: {
            getRepo: vi
              .fn()
              .mockResolvedValue({ data: { did: 'did:plc:alice' } }),
          },
        },
      },
      app: {
        bsky: {
          actor: {
            getProfile: vi
              .fn()
              .mockResolvedValue({ data: { handle: 'alice.test' } }),
          },
        },
      },
      com: {
        atproto: {
          label: {
            queryLabels: vi.fn().mockRejectedValue(new Error('unavailable')),
          },
        },
      },
    } as unknown as Agent
    const result = await fetchModActionSubject(
      agent,
      'at://did:plc:alice/chat.bsky.convo.message/id',
    )
    expect(result).toMatchObject({
      repo: { did: 'did:plc:alice' },
      profile: { handle: 'alice.test' },
    })
    expect(result.labels).toBeUndefined()
  })
})
