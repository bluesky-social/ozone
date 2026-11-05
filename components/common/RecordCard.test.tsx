import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecordCard } from './RecordCard'

const state = vi.hoisted(() => ({
  query: {} as { data?: unknown; error?: unknown },
  snapshot: null as null | Record<string, unknown>,
}))

// Only the record query is controlled; repo/profile lookups stay empty.
vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) =>
    queryKey[0] === 'recordCard' ? state.query : {},
}))
vi.mock('@/shell/ConfigurationContext', () => ({
  useLabelerAgent: () => ({}),
}))
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
  state.snapshot = null
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
