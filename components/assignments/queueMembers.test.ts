import type { Agent } from '@atproto/api'
import { describe, expect, it, vi } from 'vitest'
import { filterQueueMembers, getQueueMembers } from './queueMembers'

const alice = {
  did: 'did:example:alice',
  role: 'moderator',
  disabled: false,
  profile: {
    did: 'did:example:alice',
    handle: 'alice.test',
    displayName: 'Alice',
  },
}
const bob = { did: 'did:example:bob', role: 'admin', disabled: true }

describe('queue membership directory', () => {
  it('includes later assignment pages, deduplicates members, and omits removed members', async () => {
    const getAssignments = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          assignments: [
            { did: alice.did, moderator: alice },
            { did: 'did:example:removed' },
          ],
          cursor: 'next',
        },
      })
      .mockResolvedValueOnce({
        data: {
          assignments: [
            { did: alice.did, moderator: alice },
            { did: bob.did, moderator: bob },
          ],
        },
      })
    const agent = {
      tools: { ozone: { queue: { getAssignments } } },
    } as unknown as Agent
    expect(await getQueueMembers(agent, 42)).toEqual([alice, bob])
    expect(getAssignments.mock.calls.map(([params]) => params)).toEqual([
      { queueIds: [42], onlyActive: true, limit: 100, cursor: undefined },
      { queueIds: [42], onlyActive: true, limit: 100, cursor: 'next' },
    ])
  })

  it('fails rather than presenting incomplete membership when a later page fails', async () => {
    const getAssignments = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          assignments: [{ did: alice.did, moderator: alice }],
          cursor: 'next',
        },
      })
      .mockRejectedValueOnce(new Error('Unavailable'))
    const agent = {
      tools: { ozone: { queue: { getAssignments } } },
    } as unknown as Agent
    await expect(getQueueMembers(agent, 42)).rejects.toThrow('Unavailable')
  })

  it('combines name search, role, and account status for assigned members', () => {
    const members = [alice, bob]
    expect(
      filterQueueMembers(members, {
        q: 'ALICE',
        roles: ['moderator'],
        disabled: false,
      }),
    ).toEqual([alice])
    expect(
      filterQueueMembers(members, { q: '', roles: ['admin'], disabled: true }),
    ).toEqual([bob])
    expect(
      filterQueueMembers(members, { q: '', roles: ['admin'], disabled: false }),
    ).toEqual([])
    expect(filterQueueMembers(members, { q: '', roles: [] })).toEqual([])
  })
})
