import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecordCard } from './RecordCard'
import { fetchAtmosphereRecordView } from './externalRecords/atmosphereRecordView'

type QueryOptions = {
  queryKey: unknown[]
  queryFn: Function
  enabled?: boolean
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
// Import-only stubs: hydrated gallery rendering is covered in ExternalRecordEnhancedView.test.
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
const render = (collection: string) =>
  renderToStaticMarkup(<RecordCard uri={`at://${did}/${collection}/1`} />)

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
  ])('renders %s with its simple renderer', (collection, type) => {
    state.query = { data: { cid: 'livecid', value: { title: 'live' } } }
    const html = render(collection)
    expect(html).toContain(`data-type="${type}"`)
    expect(html).toContain('data-cid="livecid"')
  })

  it('renders a snapshot (value and CID) without ozoneValue when the live request fails', () => {
    state.query = { error: new Error('RecordNotFound') }
    state.snapshot = { cid: 'snapcid', value: { title: 'old' } }
    const html = render('social.grain.gallery')
    expect(html).toContain('data-cid="snapcid"')
    expect(html).toContain('old')
    expect(html).not.toContain('RecordNotFound')
  })

  it('prefers the snapshot over the live record', () => {
    state.query = { data: { cid: 'livecid', value: { title: 'live' } } }
    state.snapshot = { cid: 'snapcid', value: { title: 'old' } }
    expect(render('place.stream.livestream')).toContain('data-cid="snapcid"')
  })

  it('renders no record card when the live request fails and there is no snapshot', () => {
    state.query = { error: new Error('RecordNotFound') }
    expect(render('social.grain.photo')).not.toContain('data-type')
  })
})

describe('RecordCard Appview context', () => {
  const appviewCollections = [
    'site.standard.document',
    'site.standard.publication',
    'social.grain.gallery',
    'place.stream.livestream',
  ]
  const uriFor = (collection: string) => `at://${did}/${collection}/1`
  const lastKey = () => state.appviewQueries.at(-1)?.queryKey

  it.each(appviewCollections)(
    'pins the live %s to its URI and CID, scoped by account and labeler',
    async (collection) => {
      state.query = { data: { cid: 'livecid', value: { title: 'live' } } }
      render(collection)
      expect(lastKey()).toEqual([
        'atmosphereRecordView',
        {
          uri: uriFor(collection),
          cid: 'livecid',
          did: 'did:plc:mod',
          proxy: 'did:plc:ozone#atproto_labeler',
        },
      ])
      await state.appviewQueries[0].queryFn({ signal: 'signal' })
      expect(fetchAtmosphereRecordView).toHaveBeenCalledWith(
        state.agent,
        { uri: uriFor(collection), cid: 'livecid' },
        'signal',
      )
    },
  )

  it('pins a selected snapshot CID instead of the live CID, and a different CID gets its own query', () => {
    state.query = { data: { cid: 'livecid', value: {} } }
    render('social.grain.gallery')
    state.snapshot = { cid: 'snapcid', value: {} }
    render('social.grain.gallery')
    const cids = state.appviewQueries.map(
      (q) => (q.queryKey[1] as { cid: string }).cid,
    )
    expect(cids).toEqual(['livecid', 'snapcid'])
  })

  it('works for a snapshot without ozoneValue after the live request fails', () => {
    state.query = { error: new Error('RecordNotFound') }
    state.snapshot = { cid: 'snapcid', value: { title: 'old' } }
    const html = render('site.standard.publication')
    expect(lastKey()?.[1]).toMatchObject({ cid: 'snapcid' })
    expect(html).toContain('Loading Appview context')
    expect(html).toContain('data-cid="snapcid"')
  })

  it.each([
    ['loading', { isLoading: true }, 'Loading Appview context'],
    [
      'failed',
      { error: new Error('boom') },
      'Appview context unavailable: boom',
    ],
    ['empty', { data: {} }, 'Appview context unavailable'],
  ])(
    'keeps the simple record visible while Appview is %s',
    (_n, appview, text) => {
      state.query = { data: { cid: 'livecid', value: { title: 'live' } } }
      state.appview = appview
      const html = render('place.stream.livestream')
      expect(html).toContain(text)
      expect(html).toContain('data-cid="livecid"')
      expect(html.indexOf(text)).toBeLessThan(html.indexOf('data-cid'))
    },
  )

  it('shows hydrated context above the simple record', () => {
    state.query = { data: { cid: 'livecid', value: {} } }
    state.appview = {
      data: {
        view: {
          $type: 'app.bsky.embed.external#viewLivestream',
          uri: 'https://stream.test/live',
        },
      },
    }
    const html = render('place.stream.livestream')
    expect(html.indexOf('https://stream.test/live')).toBeLessThan(
      html.indexOf('data-cid'),
    )
  })

  it.each([
    ['photo', 'social.grain.photo'],
    ['unknown collection', 'com.example.thing'],
  ])('never requests Appview context for a %s', (_n, collection) => {
    state.query = { data: { cid: 'livecid', value: {} } }
    const html = render(collection)
    expect(state.appviewQueries).toHaveLength(0)
    expect(html).not.toContain('Appview')
  })

  it('does not request Appview context without a selected record', () => {
    state.query = { error: new Error('RecordNotFound') }
    render('social.grain.gallery')
    expect(state.appviewQueries).toHaveLength(0)
  })
})
