import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecordCard } from './RecordCard'
import { fetchAtmosphereRecordView } from './externalRecords/atmosphereRecordView'

type QueryOptions = {
  queryKey: unknown[]
  queryFn: (context: { signal?: AbortSignal }) => Promise<unknown>
}
const state = vi.hoisted(() => ({
  query: {} as { data?: unknown; error?: unknown },
  appview: {} as { data?: unknown; error?: unknown; isLoading?: boolean },
  appviewQueries: [] as QueryOptions[],
  snapshot: null as null | Record<string, unknown>,
  agent: { did: 'did:plc:mod', proxy: 'did:plc:ozone#atproto_labeler' },
}))

// Only the record and Appview queries are controlled; repo/profile lookups
// stay empty.
vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: QueryOptions) => {
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
vi.mock('@/dms/ConvoCard', () => ({}))
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
  state.snapshot = null
  vi.mocked(fetchAtmosphereRecordView).mockClear()
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
