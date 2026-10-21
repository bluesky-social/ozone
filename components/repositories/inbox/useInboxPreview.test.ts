import { describe, expect, it, vi } from 'vitest'
import { Agent } from '@atproto/api'
import inbox from '../../../cypress/fixtures/inbox.json'
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
} from './api'
import { appealLabel, notificationLabel } from './presentation'

const subject = {
  $type: 'com.atproto.admin.defs#repoRef' as const,
  did: inbox.did,
}
const report = { ...inbox.report, isRead: false }
const detail = { ...inbox.item, actions: inbox.actions }

// Exercise the released lexicons and actual XRPC serialization/validation.
function mockAgent(...responses: unknown[]) {
  const fetch = vi
    .fn()
    .mockImplementation(async () =>
      Response.json(responses.length > 1 ? responses.shift() : responses[0]),
    )
  const agent = new Agent({ service: 'https://pds.test', fetch }).withProxy(
    'atproto_labeler',
    'did:plc:ozone',
  )
  return { agent, fetch }
}
function request(fetch: ReturnType<typeof vi.fn>, index = 0) {
  return new URL(fetch.mock.calls[index][0])
}

describe('moderator inbox preview requests', () => {
  it.each(['pending', 'resolved', 'unread'] as const)(
    'filters actioned subjects by %s with explicit sorting',
    async (filter) => {
      const { agent, fetch } = mockAgent({ subjects: [], cursor: 'next' })
      const signal = new AbortController().signal
      await fetchInboxPreviewPage(
        agent,
        inbox.did,
        'actioned-subjects',
        'previous',
        signal,
        filter,
        { sortField: 'createdAt', sortDirection: 'asc' },
      )
      expect(Object.fromEntries(request(fetch).searchParams)).toEqual({
        did: inbox.did,
        limit: '50',
        cursor: 'previous',
        filter,
        sortField: 'createdAt',
        sortDirection: 'asc',
      })
      expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'get', signal })
    },
  )

  it('paginates action history with the same subject and preview account', async () => {
    const { agent, fetch } = mockAgent(detail)
    await fetchInboxDetail(
      agent,
      inbox.did,
      'actioned-subjects',
      inbox.did,
      undefined,
      'older::100',
    )
    expect(Object.fromEntries(request(fetch).searchParams)).toEqual({
      did: inbox.did,
      subject: inbox.did,
      limit: '50',
      cursor: 'older::100',
    })
  })

  it('reads standing, counts, and independent push preferences for the preview account', async () => {
    const preferences = { reports: false, account: true, labels: false }
    const { agent, fetch } = mockAgent(
      {
        src: inbox.item.src,
        standing: 'warning',
        updatedAt: '2026-10-01T00:00:00Z',
      },
      { unreadCounts: { total: 4, reports: 2, subjects: 1, accountStatus: 1 } },
      { preferences },
    )
    expect(await fetchAccountStatus(agent, inbox.did)).toMatchObject({
      standing: 'warning',
    })
    expect(await fetchUnreadCounts(agent, inbox.did)).toMatchObject({
      total: 4,
      reports: 2,
      subjects: 1,
      accountStatus: 1,
    })
    expect(await fetchNotificationPreferences(agent, inbox.did)).toEqual(
      preferences,
    )
    expect(
      fetch.mock.calls.map(([path, init]) => {
        const url = new URL(path)
        expect(url.searchParams.get('did')).toBe(inbox.did)
        expect(init.method.toUpperCase()).toBe('GET')
        return url.pathname.split('.').pop()
      }),
    ).toEqual([
      'getAccountStatus',
      'getUnreadCount',
      'getNotificationPreferences',
    ])
  })

  it('passes notification filters and cursors to the preview read endpoint', async () => {
    const { agent, fetch } = mockAgent({
      notifications: inbox.notifications,
      cursor: 'next',
    })
    const result = await fetchNotificationsPage(
      agent,
      inbox.did,
      { section: 'subjects', reason: 'appealResolved', unreadOnly: true },
      'older',
    )
    expect(request(fetch).pathname).toBe(
      '/xrpc/tools.ozone.inbox.listNotifications',
    )
    expect(Object.fromEntries(request(fetch).searchParams)).toEqual({
      did: inbox.did,
      limit: '50',
      section: 'subjects',
      reasons: 'appealResolved',
      unreadOnly: 'true',
      cursor: 'older',
    })
    expect(result).toEqual({ items: inbox.notifications, cursor: 'next' })
  })

  it('omits an empty reason and references the specific decision when appealing', async () => {
    const { agent, fetch } = mockAgent({
      ...inbox.item,
      appeal: { state: 'pending' },
    })
    await submitInboxAppeal(agent, subject, '', 27)
    expect(await new Response(fetch.mock.calls[0][1].body).json()).toEqual({
      subject,
      action: {
        $type: 'tools.ozone.inbox.appealActionedSubject#actionRef',
        id: 27,
      },
    })
  })

  it('rejects malformed notification pages using the released lexicon', async () => {
    const { agent } = mockAgent({ notifications: {} })
    await expect(fetchNotificationsPage(agent, inbox.did)).rejects.toThrow()
  })

  it('passes the route DID and cursor to the reports endpoint', async () => {
    const { agent, fetch } = mockAgent({
      reports: [report],
      cursor: 'next::42',
    })
    const result = await fetchInboxPreviewPage(
      agent,
      inbox.did,
      'reports',
      'previous::1',
    )
    expect(request(fetch).pathname).toBe('/xrpc/tools.ozone.inbox.listReports')
    expect(Object.fromEntries(request(fetch).searchParams)).toEqual({
      did: inbox.did,
      cursor: 'previous::1',
      limit: '50',
    })
    expect(result).toEqual({ items: [report], cursor: 'next::42' })
  })

  it('applies the reports filter without losing the preview DID', async () => {
    const { agent, fetch } = mockAgent({ reports: [] })
    await fetchInboxPreviewPage(
      agent,
      inbox.did,
      'reports',
      undefined,
      undefined,
      'unread',
    )
    expect(request(fetch).searchParams.get('did')).toBe(inbox.did)
    expect(request(fetch).searchParams.get('filter')).toBe('unread')
  })

  it('surfaces typed backend authorization errors', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { error: 'Forbidden', message: 'Unauthorized' },
          { status: 403 },
        ),
      )
    const agent = new Agent({ service: 'https://pds.test', fetch })
    await expect(
      fetchInboxPreviewPage(agent, inbox.did, 'actioned-subjects'),
    ).rejects.toThrow('Unauthorized')
    expect(request(fetch).pathname).toBe(
      '/xrpc/tools.ozone.inbox.listActionedSubjects',
    )
  })

  it('reads actioned subjects from the subjects response field', async () => {
    const { agent } = mockAgent({ subjects: [inbox.item] })
    expect(
      await fetchInboxPreviewPage(agent, inbox.did, 'actioned-subjects'),
    ).toEqual({ items: [inbox.item], cursor: undefined })
  })

  it('retains the labeler proxy on all signed-in agent inbox calls', async () => {
    const { agent, fetch } = mockAgent(
      { subjects: [] },
      { reports: [] },
      detail,
      { report: inbox.report },
      {
        src: inbox.item.src,
        standing: 'good',
        updatedAt: '2026-10-01T00:00:00Z',
      },
      { unreadCounts: { total: 0 } },
      { preferences: { reports: true, account: false, labels: true } },
      { notifications: [] },
      { ...inbox.item, appeal: { state: 'pending' } },
    )
    await fetchInboxPreviewPage(agent, inbox.did, 'actioned-subjects')
    await fetchInboxPreviewPage(agent, inbox.did, 'reports')
    await fetchInboxDetail(agent, inbox.did, 'actioned-subjects', inbox.did)
    await fetchInboxDetail(agent, inbox.did, 'reports', 900)
    await fetchAccountStatus(agent, inbox.did)
    await fetchUnreadCounts(agent, inbox.did)
    await fetchNotificationPreferences(agent, inbox.did)
    await fetchNotificationsPage(agent, inbox.did)
    await submitInboxAppeal(agent, subject, '')
    expect(fetch).toHaveBeenCalledTimes(9)
    for (const [, init] of fetch.mock.calls) {
      expect(new Headers(init.headers).get('atproto-proxy')).toBe(
        'did:plc:ozone#atproto_labeler',
      )
    }
  })

  it('passes the preview DID to both detail endpoints', async () => {
    const { agent, fetch } = mockAgent({ report: inbox.report }, detail)
    await fetchInboxDetail(agent, inbox.did, 'reports', 900)
    expect(request(fetch).pathname).toBe('/xrpc/tools.ozone.inbox.getReport')
    expect(request(fetch).searchParams.get('did')).toBe(inbox.did)
    expect(request(fetch).searchParams.get('id')).toBe('900')
    await fetchInboxDetail(
      agent,
      inbox.did,
      'actioned-subjects',
      inbox.subject.uri,
    )
    expect(request(fetch, 1).pathname).toBe(
      '/xrpc/tools.ozone.inbox.getActionedSubject',
    )
    expect(request(fetch, 1).searchParams.get('subject')).toBe(
      inbox.subject.uri,
    )
    expect(request(fetch, 1).searchParams.get('did')).toBe(inbox.did)
  })

  it('submits an appeal with subject and reason to the labeler', async () => {
    const { agent, fetch } = mockAgent({
      ...inbox.item,
      appeal: { state: 'pending' },
    })
    await submitInboxAppeal(agent, subject, 'Please review')
    expect(request(fetch).pathname).toBe(
      '/xrpc/tools.ozone.inbox.appealActionedSubject',
    )
    expect(await new Response(fetch.mock.calls[0][1].body).json()).toEqual({
      subject,
      reason: 'Please review',
    })
  })

  it.each(['approved', 'denied'] as const)(
    'preserves %s appeal outcomes through generated response validation',
    async (outcome) => {
      const { agent } = mockAgent(
        {
          subjects: [
            { ...inbox.item, appeal: { ...inbox.item.appeal, outcome } },
          ],
        },
        { ...detail, appeal: { ...detail.appeal, outcome } },
        {
          notifications: [
            {
              ...inbox.notifications[0],
              reason: 'appealResolved',
              target: {
                $type: 'tools.ozone.inbox.defs#subjectRef',
                subject,
                appealOutcome: outcome,
              },
            },
          ],
        },
      )
      const list = await fetchInboxPreviewPage(
        agent,
        inbox.did,
        'actioned-subjects',
      )
      expect(appealLabel(list.items[0].appeal!)).toBe(
        outcome === 'approved' ? 'Approved' : 'Denied',
      )
      const data = await fetchInboxDetail(
        agent,
        inbox.did,
        'actioned-subjects',
        inbox.did,
      )
      expect(appealLabel(data.appeal!)).toBe(
        outcome === 'approved' ? 'Approved' : 'Denied',
      )
      const notifications = await fetchNotificationsPage(agent, inbox.did)
      expect(notificationLabel(notifications.items[0])).toBe(
        `Appeal ${outcome}`,
      )
    },
  )

  it('deduplicates and batches subject previews for the loaded page', async () => {
    const getSubjects = vi
      .fn()
      .mockImplementation(async ({ subjects }: { subjects: string[] }) => ({
        data: { subjects: subjects.map((subject) => ({ subject })) },
      }))
    const items = Array.from({ length: 52 }, (_, index) => ({
      subject: { ...subject, did: `did:plc:${index}` },
    }))
    items.push({ subject: { ...subject, did: 'did:plc:0' } })
    const result = await hydrateInboxSubjects(
      { tools: { ozone: { moderation: { getSubjects } } } } as never,
      items,
    )
    expect(getSubjects).toHaveBeenCalledTimes(2)
    expect(getSubjects.mock.calls[0][0].subjects).toHaveLength(50)
    expect(getSubjects.mock.calls[1][0].subjects).toHaveLength(2)
    expect(Object.keys(result)).toHaveLength(52)
  })

  it('does not mistake chat reports or future subject types for accounts', () => {
    expect(
      subjectKey({
        $type: 'chat.bsky.convo.defs#messageRef',
        did: 'did:plc:sender',
        convoId: 'c',
        messageId: 'm',
      }),
    ).toBeUndefined()
    expect(subjectKey({ $type: 'future.subject' })).toBeUndefined()
  })
})
