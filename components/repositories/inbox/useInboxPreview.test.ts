import { describe, expect, it, vi } from 'vitest'
import { Agent } from '@atproto/api'
import { fetchInboxPreviewPage, type InboxReport } from './api'

describe('moderator inbox preview requests', () => {
  it('passes the route DID and cursor to the reports endpoint', async () => {
    const fetchHandler = vi.fn().mockResolvedValue(
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

  it('requests actioned subjects and surfaces backend authorization errors', async () => {
    const fetchHandler = vi.fn().mockResolvedValue(
      Response.json({ error: 'Forbidden', message: 'Unauthorized' }, { status: 403 }),
    )
    await expect(
      fetchInboxPreviewPage(
        { fetchHandler },
        'did:plc:target',
        'actioned-subjects',
      ),
    ).rejects.toThrow('Unauthorized')
    const request = new URL(fetchHandler.mock.calls[0][0], 'https://ozone.test')
    expect(request.pathname).toBe('/xrpc/tools.ozone.inbox.listActionedSubjects')
  })

  it('reads the actioned subjects list from the subjects response field', async () => {
    const fetchHandler = vi.fn().mockResolvedValue(
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
})
