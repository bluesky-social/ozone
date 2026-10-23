import { Agent } from '@atproto/api'
import { describe, expect, it, vi } from 'vitest'
import queues from '../../cypress/fixtures/queues.json'
import type { CreateQueueInput } from './useQueues'
import { reasonTypeOptions } from '../reports/helpers/getType'

describe('additive queue criteria with the published API client', () => {
  it('serializes creation criteria and preserves them through response validation', async () => {
    const criteria = {
      reporterTags: ['team:alpha'],
      accountTags: ['needs-review'],
      reportTypes: Object.keys(reasonTypeOptions),
      strictAccess: true,
    }
    const input: CreateQueueInput = {
      name: 'Account review',
      subjectTypes: ['account', 'record'],
      ...criteria,
    }
    const queue = { ...queues.spamQueue, ...input }
    const fetch = vi.fn().mockResolvedValue(Response.json({ queue }))
    const agent = new Agent({ service: 'https://ozone.test', fetch })
    const { data } = await agent.tools.ozone.queue.createQueue(input)

    expect(criteria.reportTypes.length).toBeGreaterThan(25)

    expect(new URL(fetch.mock.calls[0][0]).pathname).toBe(
      '/xrpc/tools.ozone.queue.createQueue',
    )
    expect(await new Response(fetch.mock.calls[0][1].body).json()).toEqual(
      input,
    )
    expect(data.queue).toMatchObject(criteria)
  })

  it('retains new fields in list results while accepting legacy queues', async () => {
    const taggedQueue = {
      ...queues.spamQueue,
      id: 10,
      reporterTags: ['team:alpha'],
      accountTags: [],
      strictAccess: true,
      reportTypes: ['com.atproto.moderation.defs#reasonSpam'],
    }
    const fetch = vi
      .fn()
      .mockResolvedValue(
        Response.json({ queues: [taggedQueue, queues.hateSpeechQueue] }),
      )
    const agent = new Agent({ service: 'https://ozone.test', fetch })
    const { data } = await agent.tools.ozone.queue.listQueues({})
    expect(data.queues).toEqual([taggedQueue, queues.hateSpeechQueue])
  })

  it('serializes strict access updates without sending matching criteria', async () => {
    const queue = { ...queues.spamQueue, strictAccess: false }
    const fetch = vi.fn().mockResolvedValue(Response.json({ queue }))
    const agent = new Agent({ service: 'https://ozone.test', fetch })
    const input = { queueId: queue.id, name: queue.name, strictAccess: false }
    const { data } = await agent.tools.ozone.queue.updateQueue(input)
    expect(await new Response(fetch.mock.calls[0][1].body).json()).toEqual(
      input,
    )
    expect(data.queue.strictAccess).toBe(false)
  })
})
