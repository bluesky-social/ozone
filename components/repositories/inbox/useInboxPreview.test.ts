import { describe, expect, it, vi } from 'vitest'
import { Agent } from '@atproto/api'
import {
  fetchInboxDetail,
  fetchAccountStatus,
  fetchUnreadCounts,
  fetchNotificationPreferences,
  fetchNotificationsPage,
  fetchInboxPreviewPage,
  hydrateInboxSubjects,
  subjectKey,
  submitInboxAppeal,
  type InboxReport,
} from './api'

describe('moderator inbox preview requests', () => {
  it.each(['pending', 'resolved', 'unread'] as const)(
    'filters actioned subjects by %s with explicit sorting',
    async (filter) => {
      const fetchHandler = vi
        .fn()
        .mockResolvedValue(Response.json({ subjects: [], cursor: 'next' }))
      const signal = new AbortController().signal
      await fetchInboxPreviewPage(
        { fetchHandler },
        'did:plc:target',
        'actioned-subjects',
        'previous',
        signal,
        filter,
        { sortField: 'createdAt', sortDirection: 'asc' },
      )
      const url = new URL(fetchHandler.mock.calls[0][0], 'https://ozone.test')
      expect(Object.fromEntries(url.searchParams)).toEqual({
        did: 'did:plc:target',
        limit: '50',
        cursor: 'previous',
        filter,
        sortField: 'createdAt',
        sortDirection: 'asc',
      })
      expect(fetchHandler.mock.calls[0][1]).toEqual({ method: 'GET', signal })
    },
  )

  it('paginates action history with the same subject and preview account', async () => {
    const fetchHandler = vi
      .fn()
      .mockResolvedValue(Response.json({ actions: [] }))
    await fetchInboxDetail(
      { fetchHandler },
      'did:plc:target',
      'actioned-subjects',
      'did:plc:target',
      undefined,
      'older::100',
    )
    const url = new URL(fetchHandler.mock.calls[0][0], 'https://ozone.test')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      did: 'did:plc:target',
      subject: 'did:plc:target',
      limit: '50',
      cursor: 'older::100',
    })
  })

  it('reads standing, notification counts, and push preferences for the preview account', async () => {
    const fetchHandler = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          standing: 'warning',
          updatedAt: '2026-10-01T00:00:00Z',
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          unreadCounts: { total: 4, reports: 2, subjects: 1, accountStatus: 1 },
        }),
      )
      .mockResolvedValueOnce(Response.json({ preferences: { push: false } }))
    const agent = { fetchHandler }
    expect(await fetchAccountStatus(agent, 'did:plc:target')).toMatchObject({
      standing: 'warning',
    })
    expect(await fetchUnreadCounts(agent, 'did:plc:target')).toEqual({
      total: 4,
      reports: 2,
      subjects: 1,
      accountStatus: 1,
    })
    expect(await fetchNotificationPreferences(agent, 'did:plc:target')).toEqual(
      { push: false },
    )
    expect(
      fetchHandler.mock.calls.map(([path, init]) => {
        const url = new URL(path, 'https://ozone.test')
        expect(url.searchParams.get('did')).toBe('did:plc:target')
        expect(init.method).toBe('GET')
        return url.pathname.split('.').pop()
      }),
    ).toEqual([
      'getAccountStatus',
      'getUnreadCount',
      'getNotificationPreferences',
    ])
  })

  it('passes notification filters and cursors to the preview read endpoint', async () => {
    const fetchHandler = vi
      .fn()
      .mockResolvedValue(
        Response.json({ notifications: [{ id: 5 }], cursor: 'next' }),
      )
    const result = await fetchNotificationsPage(
      { fetchHandler },
      'did:plc:target',
      { section: 'subjects', reason: 'appealResolved', unreadOnly: true },
      'older',
    )
    const url = new URL(fetchHandler.mock.calls[0][0], 'https://ozone.test')
    expect(url.pathname).toBe('/xrpc/tools.ozone.inbox.listNotifications')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      did: 'did:plc:target',
      limit: '50',
      section: 'subjects',
      reasons: 'appealResolved',
      unreadOnly: 'true',
      cursor: 'older',
    })
    expect(result).toEqual({ items: [{ id: 5 }], cursor: 'next' })
  })

  it('omits an empty reason and references the specific decision when appealing', async () => {
    const fetchHandler = vi
      .fn()
      .mockResolvedValue(Response.json({ appeal: { state: 'pending' } }))
    const subject = {
      did: 'did:plc:target',
      $type: 'com.atproto.admin.defs#repoRef',
    }
    await submitInboxAppeal({ fetchHandler }, subject, '', 27)
    expect(JSON.parse(fetchHandler.mock.calls[0][1].body)).toEqual({
      subject,
      action: {
        $type: 'tools.ozone.inbox.appealActionedSubject#actionRef',
        id: 27,
      },
    })
  })

  it('rejects malformed notification pages', async () => {
    const fetchHandler = vi
      .fn()
      .mockResolvedValue(Response.json({ notifications: {} }))
    await expect(
      fetchNotificationsPage({ fetchHandler }, 'did:plc:target'),
    ).rejects.toThrow('unexpected response')
  })
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

  it('does not mistake a chat report for an account subject', () => {
    expect(
      subjectKey({
        $type: 'chat.bsky.convo.defs#messageRef',
        did: 'did:plc:sender',
        convoId: 'c',
        messageId: 'm',
      }),
    ).toBeUndefined()
  })
})
