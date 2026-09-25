import { describe, expect, it, vi } from 'vitest'
import { Agent } from '@atproto/api'
import {
  fetchInboxDetail,
  fetchInboxPreviewPage,
  hydrateInboxSubjects,
  submitInboxAppeal,
  type InboxReport,
} from './api'

describe('moderator inbox preview requests', () => {
  it('passes the route DID and cursor to the reports endpoint', async () => {
    const fetchHandler = vi
      .fn()
      .mockResolvedValue(
        Response.json({ reports: [{ id: 42 }], cursor: 'next::42' }),
      )
    const result = await fetchInboxPreviewPage<InboxReport>(
      { fetchHandler },
      'did:plc:target',
      'reports',
      'previous::1',
    )
    const request = new URL(fetchHandler.mock.calls[0][0], 'https://ozone.test')
    expect(request.pathname).toBe('/xrpc/tools.ozone.inbox.listReports')
    expect(request.searchParams.get('did')).toBe('did:plc:target')
    expect(request.searchParams.get('cursor')).toBe('previous::1')
    expect(request.searchParams.get('limit')).toBe('50')
    expect(result).toEqual({ items: [{ id: 42 }], cursor: 'next::42' })
  })

  it('applies the reports filter without losing the preview DID', async () => {
    const fetchHandler = vi
      .fn()
      .mockResolvedValue(Response.json({ reports: [] }))
    await fetchInboxPreviewPage(
      { fetchHandler },
      'did:plc:target',
      'reports',
      undefined,
      undefined,
      'unread',
    )
    const request = new URL(fetchHandler.mock.calls[0][0], 'https://ozone.test')
    expect(request.searchParams.get('did')).toBe('did:plc:target')
    expect(request.searchParams.get('filter')).toBe('unread')
  })

  it('requests actioned subjects and surfaces backend authorization errors', async () => {
    const fetchHandler = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { error: 'Forbidden', message: 'Unauthorized' },
          { status: 403 },
        ),
      )
    await expect(
      fetchInboxPreviewPage(
        { fetchHandler },
        'did:plc:target',
        'actioned-subjects',
      ),
    ).rejects.toThrow('Unauthorized')
    const request = new URL(fetchHandler.mock.calls[0][0], 'https://ozone.test')
    expect(request.pathname).toBe(
      '/xrpc/tools.ozone.inbox.listActionedSubjects',
    )
  })

  it('reads the actioned subjects list from the subjects response field', async () => {
    const fetchHandler = vi
      .fn()
      .mockResolvedValue(
        Response.json({ subjects: [{ subject: { did: 'did:plc:target' } }] }),
      )
    const result = await fetchInboxPreviewPage(
      { fetchHandler },
      'did:plc:target',
      'actioned-subjects',
    )
    expect(result).toEqual({
      items: [{ subject: { did: 'did:plc:target' } }],
      cursor: undefined,
    })
  })

  it('retains the labeler proxy configured on the signed-in agent', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ subjects: [] }))
    const agent = new Agent({ service: 'https://pds.test', fetch }).withProxy(
      'atproto_labeler',
      'did:plc:ozone',
    )
    await fetchInboxPreviewPage(agent, 'did:plc:target', 'actioned-subjects')
    const headers = new Headers(fetch.mock.calls[0][1].headers)
    expect(headers.get('atproto-proxy')).toBe('did:plc:ozone#atproto_labeler')
  })

  it('passes the preview DID to both detail endpoints', async () => {
    const fetchHandler = vi
      .fn()
      .mockImplementation(async () => Response.json({ report: { id: 42 } }))
    await fetchInboxDetail({ fetchHandler }, 'did:plc:target', 'reports', 42)
    let request = new URL(fetchHandler.mock.calls[0][0], 'https://ozone.test')
    expect(request.pathname).toBe('/xrpc/tools.ozone.inbox.getReport')
    expect(request.searchParams.get('did')).toBe('did:plc:target')
    expect(request.searchParams.get('id')).toBe('42')

    await fetchInboxDetail(
      { fetchHandler },
      'did:plc:target',
      'actioned-subjects',
      'at://did:plc:target/app.bsky.feed.post/abc',
    )
    request = new URL(fetchHandler.mock.calls[1][0], 'https://ozone.test')
    expect(request.pathname).toBe('/xrpc/tools.ozone.inbox.getActionedSubject')
    expect(request.searchParams.get('subject')).toBe(
      'at://did:plc:target/app.bsky.feed.post/abc',
    )
    expect(request.searchParams.get('did')).toBe('did:plc:target')
  })

  it('submits an appeal with the subject and reason to the labeler', async () => {
    const fetchHandler = vi
      .fn()
      .mockResolvedValue(Response.json({ appeal: { state: 'pending' } }))
    const subject = {
      $type: 'com.atproto.admin.defs#repoRef',
      did: 'did:plc:target',
    }
    await submitInboxAppeal({ fetchHandler }, subject, 'Please review')
    expect(fetchHandler.mock.calls[0][0]).toBe(
      '/xrpc/tools.ozone.inbox.appealActionedSubject',
    )
    expect(fetchHandler.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ subject, reason: 'Please review' }),
    })
  })

  it('deduplicates and batches subject previews for the loaded page', async () => {
    const getSubjects = vi
      .fn()
      .mockImplementation(async ({ subjects }: { subjects: string[] }) => ({
        data: { subjects: subjects.map((subject) => ({ subject })) },
      }))
    const items = Array.from({ length: 52 }, (_, index) => ({
      subject: { did: `did:plc:${index}` },
    }))
    items.push({ subject: { did: 'did:plc:0' } })
    const result = await hydrateInboxSubjects(
      { tools: { ozone: { moderation: { getSubjects } } } } as never,
      items,
    )
    expect(getSubjects).toHaveBeenCalledTimes(2)
    expect(getSubjects.mock.calls[0][0].subjects).toHaveLength(50)
    expect(getSubjects.mock.calls[1][0].subjects).toHaveLength(2)
    expect(Object.keys(result)).toHaveLength(52)
  })
})
