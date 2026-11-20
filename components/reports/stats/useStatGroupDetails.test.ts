import { Agent } from '@atproto/api'
import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { statGroupDetailsQueryOptions } from './useStatGroupDetails'

vi.mock('@/shell/ConfigurationContext', () => ({
  useLabelerAgent: vi.fn(),
}))

const body = {
  computedAt: '2026-11-11T12:00:00.000Z',
  startDate: '2026-11-09T00:00:00.000Z',
  endDate: '2026-11-11T00:00:00.000Z',
  reportTypeBreakdown: {
    totalCount: 2,
    stats: [
      { reportType: 'tools.ozone.report.defs#reasonOther', inboundCount: 2 },
    ],
  },
}

function mockAgent(response: Response) {
  const fetch = vi.fn(async () => response)
  const agent = new Agent({ service: 'https://pds.test', fetch }).withProxy(
    'atproto_labeler',
    'did:plc:ozone',
  )
  return { agent, fetch }
}

describe('stat group details query', () => {
  it('shares concurrent requests and fresh results while isolating queues and date windows', async () => {
    const client = new QueryClient()
    try {
      const { agent, fetch } = mockAgent(Response.json(body))
      const params = {
        queueId: 4,
        startDate: body.startDate,
        endDate: body.endDate,
      }
      const options = statGroupDetailsQueryOptions(agent, params)
      const results = await Promise.all([
        client.fetchQuery(options),
        client.fetchQuery(options),
      ])
      expect(results).toEqual([body, body])
      await expect(client.fetchQuery(options)).resolves.toEqual(body)
      expect(fetch).toHaveBeenCalledTimes(1)

      const nextBody = {
        ...body,
        reportTypeBreakdown: {
          totalCount: 3,
          stats: [
            { reportType: 'example.report.defs#custom', inboundCount: 3 },
          ],
        },
      }
      fetch.mockImplementation(async () => Response.json(nextBody))
      await expect(
        client.fetchQuery(
          statGroupDetailsQueryOptions(agent, { ...params, queueId: 5 }),
        ),
      ).resolves.toEqual(nextBody)
      const nextWindow = { ...params, startDate: '2026-11-08T00:00:00.000Z' }
      const nextWindowBody = { ...nextBody, startDate: nextWindow.startDate }
      fetch.mockImplementation(async () => Response.json(nextWindowBody))
      await expect(
        client.fetchQuery(statGroupDetailsQueryOptions(agent, nextWindow)),
      ).resolves.toEqual(nextWindowBody)
      expect(fetch).toHaveBeenCalledTimes(3)
      expect(client.getQueryData(options.queryKey)).toEqual(body)
    } finally {
      client.clear()
    }
  })

  it('sends the queue and selected dates with proxy authorization and cancellation', async () => {
    const { agent, fetch } = mockAgent(Response.json(body))
    const params = {
      queueId: 4,
      startDate: body.startDate,
      endDate: body.endDate,
    }
    const signal = new AbortController().signal
    await expect(
      statGroupDetailsQueryOptions(agent, params).queryFn({ signal }),
    ).resolves.toEqual(body)
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    const request = new URL(url)
    expect(request.pathname).toBe(
      '/xrpc/tools.ozone.report.getStatGroupDetails',
    )
    expect(Object.fromEntries(request.searchParams)).toEqual({
      ...params,
      queueId: '4',
    })
    expect(init.signal).toBe(signal)
    expect(new Headers(init.headers).get('atproto-proxy')).toBe(
      'did:plc:ozone#atproto_labeler',
    )
  })

  it('validates the response and propagates inaccessible queue errors', async () => {
    const invalid = mockAgent(
      Response.json({
        ...body,
        reportTypeBreakdown: {
          totalCount: 2,
          stats: [{ reportType: 'custom', inboundCount: -1 }],
        },
      }),
    ).agent
    await expect(
      statGroupDetailsQueryOptions(invalid, { queueId: 4 }).queryFn({}),
    ).rejects.toThrow()
    const denied = mockAgent(
      Response.json(
        { error: 'QueueNotFound', message: 'Queue not found' },
        { status: 400 },
      ),
    ).agent
    await expect(
      statGroupDetailsQueryOptions(denied, { queueId: 4 }).queryFn({}),
    ).rejects.toMatchObject({ error: 'QueueNotFound' })
  })

  it.each([
    {},
    { moderatorDid: 'did:plc:moderator' },
    { reportTypes: ['tools.ozone.report.defs#reasonOther'] },
    { queueId: -1 },
  ])('fetches details for stat group %j', async (group) => {
    const { agent, fetch } = mockAgent(Response.json(body))
    await expect(
      statGroupDetailsQueryOptions(agent, group).queryFn({}),
    ).resolves.toEqual(body)
    const [url] = fetch.mock.calls[0] as unknown as [string]
    const params = new URL(url).searchParams
    for (const [name, value] of Object.entries(group)) {
      expect(params.getAll(name)).toEqual(
        Array.isArray(value) ? value : [String(value)],
      )
    }
    expect(params.has('queueId')).toBe('queueId' in group)
  })
})
