import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCreateSubjectFromId } from './subject'

const mocks = vi.hoisted(() => ({
  getRecord: vi.fn(),
  queryEvents: vi.fn(),
}))
vi.mock('@/shell/ConfigurationContext', () => ({
  useLabelerAgent: () => ({
    tools: { ozone: { moderation: mocks } },
  }),
}))

const did = 'did:plc:i5viqhs6ac365q24ssemwnnt'
const messageUri = `at://${did}/chat.bsky.convo.message/3mzo7sunwc52y`
const messageRef = {
  $type: 'chat.bsky.convo.defs#messageRef',
  did,
  convoId: 'convo-123',
  messageId: '3mzo7sunwc52y',
}

function createSubject(client = new QueryClient()) {
  let create!: ReturnType<typeof useCreateSubjectFromId>
  function Capture() {
    create = useCreateSubjectFromId()
    return null
  }
  renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <Capture />
    </QueryClientProvider>,
  )
  return create
}

beforeEach(() => {
  mocks.getRecord.mockReset()
  mocks.queryEvents.mockReset()
})

describe('create subject from ID', () => {
  it('uses the report event ID to distinguish messages with the same ID', async () => {
    mocks.queryEvents.mockResolvedValue({
      data: {
        events: [
          { id: 1, subject: { ...messageRef, convoId: 'other' } },
          { id: 2, subject: messageRef },
        ],
      },
    })
    await expect(
      createSubject()(messageUri, {
        subject: messageUri,
        eventId: 2,
        reportedBy: 'did:plc:reporter',
      }),
    ).resolves.toEqual({ subject: messageRef, record: null })
    expect(mocks.queryEvents).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: 'did:plc:reporter' }),
    )
  })

  it('rejects ambiguous message references when no report is provided', async () => {
    mocks.queryEvents.mockResolvedValue({
      data: {
        events: [
          { subject: messageRef },
          { subject: { ...messageRef, convoId: 'other' } },
        ],
      },
    })
    await expect(createSubject()(messageUri)).rejects.toThrow(
      'multiple conversations',
    )
  })

  it('detects ambiguous message references on later pages', async () => {
    mocks.queryEvents
      .mockResolvedValueOnce({
        data: { events: [{ subject: messageRef }], cursor: 'next' },
      })
      .mockResolvedValueOnce({
        data: { events: [{ subject: { ...messageRef, convoId: 'other' } }] },
      })
    await expect(createSubject()(messageUri)).rejects.toThrow(
      'multiple conversations',
    )
  })

  it('bounds event scans when a reference cannot be identified', async () => {
    mocks.queryEvents.mockResolvedValue({
      data: { events: [], cursor: 'next' },
    })
    await expect(createSubject()(messageUri)).rejects.toThrow(
      'Too many report events',
    )
    expect(mocks.queryEvents).toHaveBeenCalledTimes(10)
  })

  it('uses an exact message event lookup when supported', async () => {
    mocks.queryEvents.mockResolvedValue({
      data: { events: [{ subject: messageRef }] },
    })
    await expect(createSubject()(messageUri)).resolves.toEqual({
      subject: messageRef,
      record: null,
    })
    expect(mocks.queryEvents).toHaveBeenCalledOnce()
    expect(mocks.queryEvents).toHaveBeenCalledWith(
      expect.objectContaining({ subject: messageUri }),
    )
    expect(mocks.getRecord).not.toHaveBeenCalled()
  })

  it('recovers the message reference across report event pages without fetching a record', async () => {
    mocks.queryEvents
      .mockResolvedValueOnce({ data: { events: [] } })
      .mockResolvedValueOnce({
        data: {
          events: [{ subject: { ...messageRef, messageId: 'other' } }],
          cursor: 'next',
        },
      })
      .mockResolvedValueOnce({ data: { events: [{ subject: messageRef }] } })
    await expect(createSubject()(messageUri)).resolves.toEqual({
      subject: messageRef,
      record: null,
    })
    expect(mocks.getRecord).not.toHaveBeenCalled()
    expect(mocks.queryEvents).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ subject: did, includeAllUserRecords: true }),
    )
    expect(mocks.queryEvents).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ cursor: 'next' }),
    )
  })

  it('fails rather than inventing a message reference when no matching event exists', async () => {
    mocks.queryEvents.mockResolvedValue({ data: { events: [] } })
    await expect(createSubject()(messageUri)).rejects.toThrow(
      'Could not find the report event',
    )
    expect(mocks.getRecord).not.toHaveBeenCalled()
  })

  it('still fetches ordinary records and preserves their CID', async () => {
    const uri = `at://${did}/app.bsky.feed.post/abc`
    const record = { uri, cid: 'record-cid' }
    mocks.getRecord.mockResolvedValue({ data: record })
    await expect(createSubject()(uri)).resolves.toEqual({
      subject: { $type: 'com.atproto.repo.strongRef', ...record },
      record,
    })
    expect(mocks.queryEvents).not.toHaveBeenCalled()
  })
})
