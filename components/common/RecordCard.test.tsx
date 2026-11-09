import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecordCard } from './RecordCard'
import { PreviewCard } from './PreviewCard'
import { fetchAtmosphereRecordView } from './externalRecords/atmosphereRecordView'

type QueryOptions = {
  queryKey: unknown[]
  queryFn: (context: { signal?: AbortSignal }) => Promise<unknown>
}
const state = vi.hoisted(() => ({
  query: {} as { data?: unknown; error?: unknown },
  appview: {} as { data?: unknown; error?: unknown; isLoading?: boolean },
  appviewQueries: [] as QueryOptions[],
  queries: [] as QueryOptions[],
  messageContext: {} as {
    data?: unknown
    error?: unknown
    isLoading?: boolean
  },
  snapshot: null as null | Record<string, unknown>,
  agent: {
    did: 'did:plc:mod',
    proxy: 'did:plc:ozone#atproto_labeler',
    api: {
      chat: {
        bsky: {
          moderation: {
            getMessageContext: vi.fn(async () => ({ data: { messages: [] } })),
          },
        },
      },
    },
  },
}))

// Repo/profile lookups stay empty.
vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: QueryOptions) => {
    state.queries.push(options)
    if (options.queryKey[0] === 'messageContext') return state.messageContext
    if (options.queryKey[0] === 'atmosphereRecordView') {
      state.appviewQueries.push(options)
      return state.appview
    }
    return options.queryKey[0] === 'recordCard' ? state.query : {}
  },
}))
vi.mock('./externalRecords/atmosphereRecordView', () => ({
  fetchAtmosphereRecordView: vi.fn(async () => ({})),
}))
vi.mock('@/shell/ConfigurationContext', () => ({
  useLabelerAgent: () => state.agent,
}))
// Hydrated gallery rendering is covered in ExternalRecordEnhancedView.test.
vi.mock('@/config/useLocalPreferences', () => ({}))
vi.mock('./posts/ImageList', () => ({}))
vi.mock('@/workspace/hooks', () => ({
  useWorkspaceList: () => ({}),
  useWorkspaceAddItemsMutation: () => ({}),
  useWorkspaceRemoveItemsMutation: () => ({}),
}))
vi.mock('./snapshots/RecordWithSnapshots', () => ({
  RecordWithSnapshots: ({
    children,
  }: {
    children: (snapshot: unknown) => React.ReactNode
  }) => <>{children(state.snapshot)}</>,
}))
vi.mock('./externalRecords/SimpleRecord', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  SimpleRecord: ({
    type,
    cid,
    value,
  }: {
    type: string
    cid: string
    value: unknown
  }) => (
    <div data-type={type} data-cid={cid}>
      {JSON.stringify(value)}
    </div>
  ),
}))
// Modules that are irrelevant to the Atmosphere branch.
vi.mock('./posts/PostsFeed', () => ({}))
vi.mock('components/list/RecordCard', () => ({}))
vi.mock('./feeds/RecordCard', () => ({}))
vi.mock('./starterpacks/RecordCard', () => ({}))
vi.mock('./profileStatus/ProfileStatusCard', () => ({}))
vi.mock('@/dms/ConvoCard', () => ({
  ConvoCard: () => <div>Conversation details</div>,
}))
vi.mock('components/verification/Badge', () => ({}))
vi.mock('@/repositories/ProfileAvatar', () => ({}))
vi.mock('./profileLinks/ProfileLinkCard', () => ({}))

const did = 'did:plc:author'
const uriFor = (collection: string) => `at://${did}/${collection}/1`
const render = (collection: string) =>
  renderToStaticMarkup(<RecordCard uri={uriFor(collection)} />)

beforeEach(() => {
  state.query = {}
  state.appview = { isLoading: true }
  state.appviewQueries = []
  state.queries = []
  state.messageContext = {}
  state.snapshot = null
  state.agent.api.chat.bsky.moderation.getMessageContext.mockClear()
  vi.mocked(fetchAtmosphereRecordView).mockClear()
})

describe('RecordCard chat previews', () => {
  it('renders a message report through chat context without a record lookup', async () => {
    state.messageContext = {
      data: [
        {
          $type: 'chat.bsky.convo.defs#messageView',
          id: 'previous',
          rev: '0',
          text: 'Surrounding context',
          sender: { did: 'did:plc:recipient' },
          sentAt: '2026-01-01T00:00:00.000Z',
        },
        {
          $type: 'chat.bsky.convo.defs#messageView',
          id: '1',
          rev: '1',
          text: 'Message under review',
          sender: { did },
          sentAt: '2026-01-01T00:01:00.000Z',
        },
      ],
    }

    const html = renderToStaticMarkup(
      <PreviewCard subject={uriFor('chat.bsky.convo.message')} />,
    )
    for (const text of [
      'Reported message',
      'Surrounding context',
      'Recipient',
      'Message under review (Reported message)',
      'Reported User',
    ]) {
      expect(html).toContain(text)
    }
    expect(state.queries.map((query) => query.queryKey[0])).toEqual([
      'messageContext',
    ])
    await state.queries[0].queryFn({})
    expect(
      state.agent.api.chat.bsky.moderation.getMessageContext,
    ).toHaveBeenCalledWith({ messageId: '1' })
  })

  it.each([
    [{ isLoading: true }, 'Loading message context...'],
    [
      { error: new Error('No report for requested message') },
      'No report for requested message',
    ],
  ])('keeps loading and access errors in the chat preview', (context, text) => {
    state.messageContext = context
    expect(render('chat.bsky.convo.message')).toContain(text)
    expect(state.queries.map((query) => query.queryKey[0])).toEqual([
      'messageContext',
    ])
  })

  it('keeps whole-conversation previews separate from message context', () => {
    const html = renderToStaticMarkup(
      <PreviewCard subject={uriFor('chat.bsky.convo')} />,
    )
    expect(html).toContain('Reported conversation')
    expect(html).toContain('Conversation details')
    expect(state.queries).toHaveLength(0)
  })
})

describe('RecordCard Atmosphere routing', () => {
  it.each([
    ['site.standard.document', 'Standard document'],
    ['site.standard.publication', 'Standard publication'],
    ['social.grain.gallery', 'Grain gallery'],
    ['social.grain.photo', 'Grain photo'],
    ['place.stream.livestream', 'Livestream'],
  ])(
    'renders %s, with Appview context except for standalone photos',
    (collection, type) => {
      state.query = { data: { cid: 'livecid', value: { title: 'live' } } }
      const html = render(collection)
      expect(html).toContain(`data-type="${type}"`)
      expect(html).toContain('data-cid="livecid"')
      expect(state.appviewQueries).toHaveLength(
        collection === 'social.grain.photo' ? 0 : 1,
      )
    },
  )

  it('uses a snapshot without ozoneValue even when the live record is unavailable', () => {
    state.query = { error: new Error('RecordNotFound') }
    state.snapshot = { cid: 'snapcid', value: { title: 'old' } }
    const html = render('social.grain.gallery')
    expect(html).toContain('data-cid="snapcid"')
    expect(html).toContain('old')
    expect(state.appviewQueries[0].queryKey[1]).toMatchObject({ cid: 'snapcid' })
  })

  it('requests no Appview context when there is no selected record', () => {
    state.query = { error: new Error('RecordNotFound') }
    expect(render('social.grain.gallery')).not.toContain('data-type')
    expect(state.appviewQueries).toHaveLength(0)
  })
})

describe('RecordCard Appview context', () => {
  it('pins requests to the selected record, with cache identity scoped by account and labeler', async () => {
    state.query = { data: { cid: 'livecid', value: {} } }
    render('social.grain.gallery')
    const query = state.appviewQueries[0]
    expect(query.queryKey[1]).toEqual({
      uri: uriFor('social.grain.gallery'),
      cid: 'livecid',
      did: state.agent.did,
      proxy: state.agent.proxy,
    })
    const signal = new AbortController().signal
    await query.queryFn({ signal })
    expect(fetchAtmosphereRecordView).toHaveBeenCalledWith(
      state.agent,
      { uri: uriFor('social.grain.gallery'), cid: 'livecid' },
      signal,
    )
  })

  it('uses the selected CID for both requests and cache keys when viewing snapshots or resetting to live', async () => {
    state.query = { data: { cid: 'livecid', value: { title: 'live' } } }
    render('social.grain.gallery')
    state.snapshot = { cid: 'snapcid', value: { title: 'old' } }
    const snapshot = render('social.grain.gallery')
    expect(snapshot).toContain('data-cid="snapcid"')
    expect(snapshot).toContain('old')
    state.snapshot = null
    expect(render('social.grain.gallery')).toContain('data-cid="livecid"')

    const cids = state.appviewQueries.map(
      (q) => (q.queryKey[1] as { cid: string }).cid,
    )
    expect(cids).toEqual(['livecid', 'snapcid', 'livecid'])
    for (const query of state.appviewQueries) await query.queryFn({})
    expect(
      vi
        .mocked(fetchAtmosphereRecordView)
        .mock.calls.map(([, params]) => params.cid),
    ).toEqual(cids)
  })

  it.each([
    ['loading', { isLoading: true }, 'Loading Appview context'],
    ['failed', { error: new Error('boom') }, 'Appview context unavailable'],
    ['empty', { data: {} }, 'Appview context unavailable'],
  ])(
    'keeps the simple record visible while Appview is %s',
    (_name, appview, text) => {
      state.query = { data: { cid: 'livecid', value: { title: 'live' } } }
      state.appview = appview
      const html = render('place.stream.livestream')
      expect(html).toContain(text)
      expect(html).toContain('data-cid="livecid"')
      expect(html).toContain('live')
    },
  )
})
